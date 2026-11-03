package com.dits.myalarm

import android.Manifest
import android.app.AlarmManager
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.dits.myalarm.alarm.AlarmScheduler
import com.dits.myalarm.data.Alarm
import com.dits.myalarm.data.AlarmStore
import com.dits.myalarm.network.CloudApi
import com.dits.myalarm.update.UpdateChecker
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.time.LocalDate
import java.util.UUID

class MainActivity : ComponentActivity() {
    private lateinit var store: AlarmStore
    private val notificationPermission = registerForActivityResult(ActivityResultContracts.RequestPermission()) { }
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        store = AlarmStore(this)
        AlarmScheduler.rescheduleAll(this)
        if (Build.VERSION.SDK_INT >= 33) notificationPermission.launch(Manifest.permission.POST_NOTIFICATIONS)
        setContent { MaterialTheme(colorScheme = darkColorScheme(primary = androidx.compose.ui.graphics.Color(0xFFE7B66A), background = androidx.compose.ui.graphics.Color(0xFF101318), surface = androidx.compose.ui.graphics.Color(0xFF191E26))) { AlarmScreen() } }
    }
    @Composable private fun AlarmScreen() {
        var alarms by remember { mutableStateOf(store.all()) }
        var date by remember { mutableStateOf(LocalDate.now().toString()) }
        var shift by remember { mutableStateOf("PAGI") }
        var start by remember { mutableStateOf("04:30") }; var end by remember { mutableStateOf("05:25") }
        var editing by remember { mutableStateOf<String?>(null) }
        var message by remember { mutableStateOf("Alarm disimpan di perangkat ini dan dapat berjalan offline.") }
        var apiUrl by remember { mutableStateOf(getPreferences(0).getString("api_url", "") ?: "") }
        var email by remember { mutableStateOf(getPreferences(0).getString("email", "") ?: "") }
        var password by remember { mutableStateOf("") }
        var token by remember { mutableStateOf(getPreferences(0).getString("cloud_token", "") ?: "") }
        var register by remember { mutableStateOf(false) }
        val scope = rememberCoroutineScope()
        fun refresh() { alarms = store.all() }
        fun saveAlarm() {
            if (date.length != 10 || (shift != "LIBUR" && (start.length != 5 || end.length != 5 || start >= end))) { message = "Periksa tanggal dan rentang waktu alarm."; return }
            val item = Alarm(editing ?: UUID.randomUUID().toString(), date, shift, if (shift == "LIBUR") "" else start, if (shift == "LIBUR") "" else end)
            store.upsert(item); AlarmScheduler.cancel(this@MainActivity, item); AlarmScheduler.schedule(this@MainActivity, item); refresh(); editing = null; message = "Jadwal tersimpan. Alarm perangkat sudah dijadwalkan."
        }
        Surface(Modifier.fillMaxSize()) {
            Column(Modifier.fillMaxSize().padding(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text("Dits / MYALARM", style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.primary)
                Text("Alarm Adit", style = MaterialTheme.typography.headlineLarge)
                Text(message, style = MaterialTheme.typography.bodyMedium)
                Button(onClick = { val am = getSystemService(AlarmManager::class.java); if (Build.VERSION.SDK_INT >= 31 && !am.canScheduleExactAlarms()) startActivity(Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, Uri.parse("package:$packageName"))) else message = "Izin alarm presisi sudah tersedia." }, modifier = Modifier.fillMaxWidth()) { Text("Periksa izin alarm presisi") }
                HorizontalDivider()
                Text(if (editing == null) "Tambah jadwal" else "Edit jadwal", style = MaterialTheme.typography.titleLarge)
                OutlinedTextField(date, { date = it }, label = { Text("Tanggal (YYYY-MM-DD)") }, modifier = Modifier.fillMaxWidth())
                var expanded by remember { mutableStateOf(false) }
                Box { OutlinedButton(onClick = { expanded = true }, modifier = Modifier.fillMaxWidth()) { Text("Shift: $shift") }; DropdownMenu(expanded, { expanded = false }) { listOf("PAGI","SIANG","MALAM","LIBUR").forEach { DropdownMenuItem(text = { Text(it) }, onClick = { shift = it; when(it){"PAGI"->{start="04:30";end="05:25"};"SIANG"->{start="11:30";end="12:35"};"MALAM"->{start="20:30";end="21:15"}};expanded=false }) } } }
                if (shift != "LIBUR") Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) { OutlinedTextField(start,{start=it},label={Text("Mulai HH:mm")},modifier=Modifier.weight(1f)); OutlinedTextField(end,{end=it},label={Text("Selesai HH:mm")},modifier=Modifier.weight(1f)) }
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) { Button(onClick = { saveAlarm() }, modifier = Modifier.weight(1f)) { Text("Simpan") }; OutlinedButton(onClick = { editing=null;date=LocalDate.now().toString();shift="PAGI";start="04:30";end="05:25" }, modifier = Modifier.weight(1f)) { Text("Reset") } }
                Text("Jadwal tersimpan", style = MaterialTheme.typography.titleLarge)
                LazyColumn(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(alarms, key = { it.id }) { item -> Card(Modifier.fillMaxWidth()) { Column(Modifier.padding(12.dp)) { Text("${item.date} · ${item.shift}", style = MaterialTheme.typography.titleMedium); Text(if(item.shift=="LIBUR") "Tidak ada alarm" else "${item.start}–${item.end}"); Row { TextButton(onClick={editing=item.id;date=item.date;shift=item.shift;start=item.start;end=item.end}){Text("Edit")}; TextButton(onClick={AlarmScheduler.cancel(this@MainActivity,item);store.delete(item.id);refresh();message="Jadwal dihapus."}){Text("Hapus")}; TextButton(onClick={AlarmScheduler.schedule(this@MainActivity,item);message="Alarm dijadwalkan ulang."}){Text("Jadwalkan") } } } } }
                }
                HorizontalDivider()
                Text("Sinkronisasi cloud", style = MaterialTheme.typography.titleLarge)
                OutlinedTextField(apiUrl,{apiUrl=it},label={Text("URL Cloudflare Worker")},modifier=Modifier.fillMaxWidth())
                OutlinedTextField(email,{email=it},label={Text("Email")},modifier=Modifier.fillMaxWidth())
                OutlinedTextField(password,{password=it},label={Text("Password")},modifier=Modifier.fillMaxWidth())
                Row(horizontalArrangement=Arrangement.spacedBy(8.dp)) { OutlinedButton(onClick={register=!register;message=if(register) "Mode daftar akun" else "Mode login"},modifier=Modifier.weight(1f)){Text(if(register)"Mode: Daftar" else "Mode: Login")}; Button(onClick={ scope.launch { try { withContext(Dispatchers.IO) { val api=CloudApi(apiUrl); val t=if(register)api.register(email,password) else api.login(email,password); getPreferences(0).edit().putString("api_url",apiUrl).putString("email",email).putString("cloud_token",t).apply(); token=t }; message="Login cloud berhasil." } catch(e:Exception){message="Cloud: ${e.message}"} } },modifier=Modifier.weight(1f)){Text("Login / Daftar")} }
                Row(horizontalArrangement=Arrangement.spacedBy(8.dp)) { Button(onClick={ scope.launch { try { withContext(Dispatchers.IO){CloudApi(apiUrl,token).putAlarms(store.all())};message="Jadwal berhasil diunggah ke cloud." }catch(e:Exception){message="Upload gagal: ${e.message}"} } },enabled=token.isNotBlank(),modifier=Modifier.weight(1f)){Text("Upload")}; OutlinedButton(onClick={ scope.launch { try { val items=withContext(Dispatchers.IO){CloudApi(apiUrl,token).getAlarms()};store.save(items);items.forEach{AlarmScheduler.schedule(this@MainActivity,it)};refresh();message="Jadwal cloud berhasil diunduh dan dijadwalkan." }catch(e:Exception){message="Download gagal: ${e.message}"} } },enabled=token.isNotBlank(),modifier=Modifier.weight(1f)){Text("Download")} }
                OutlinedButton(onClick={ scope.launch { try { val result=withContext(Dispatchers.IO){UpdateChecker.check(BuildConfig.VERSION_NAME)}; message=if(result.updateAvailable) "Versi ${result.latestVersion} tersedia. Buka GitHub Releases untuk memasang update." else "Aplikasi sudah menggunakan versi terbaru (${result.latestVersion})."; if(result.updateAvailable) startActivity(Intent(Intent.ACTION_VIEW,Uri.parse(result.releaseUrl))) } catch(e:Exception){message="Pemeriksaan update gagal: ${e.message}"} } },modifier=Modifier.fillMaxWidth()){Text("Periksa pembaruan aplikasi")}
                Text("Catatan: izin notifikasi dan alarm presisi harus diaktifkan. Beberapa merek HP juga perlu mengecualikan Myalarm dari optimasi baterai.", style=MaterialTheme.typography.bodySmall)
            }
        }
    }
}
