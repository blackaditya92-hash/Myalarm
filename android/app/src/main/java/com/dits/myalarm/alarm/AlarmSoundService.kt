package com.dits.myalarm.alarm

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.media.Ringtone
import android.media.RingtoneManager
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import com.dits.myalarm.MainActivity
import com.dits.myalarm.data.AlarmStore

class AlarmSoundService : Service() {
    private var ringtone: Ringtone? = null
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP) { stopSelf(); return START_NOT_STICKY }
        val id = intent?.getStringExtra("alarmId") ?: return START_NOT_STICKY
        val alarm = AlarmStore(this).byId(id) ?: return START_NOT_STICKY
        createChannel()
        val stop = PendingIntent.getService(this, 991, Intent(this, AlarmSoundService::class.java).setAction(ACTION_STOP), PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        val open = PendingIntent.getActivity(this, 0, Intent(this, MainActivity::class.java), PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        val notification: Notification = NotificationCompat.Builder(this, AlarmReceiver.CHANNEL)
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm).setContentTitle("ALARM SHIFT ${alarm.shift}")
            .setContentText("${alarm.start}–${alarm.end} · Tekan berhenti untuk mematikan alarm")
            .setCategory(NotificationCompat.CATEGORY_ALARM).setPriority(NotificationCompat.PRIORITY_MAX)
            .setOngoing(true).setContentIntent(open).addAction(android.R.drawable.ic_media_pause, "HENTIKAN", stop).build()
        startForeground(992, notification)
        if (ringtone?.isPlaying != true) {
            ringtone = RingtoneManager.getRingtone(this, RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM))
            if (Build.VERSION.SDK_INT >= 28) ringtone?.isLooping = true
            ringtone?.play()
        }
        return START_STICKY
    }
    private fun createChannel() {
        if (Build.VERSION.SDK_INT >= 26) {
            val nm = getSystemService(NotificationManager::class.java)
            if (nm.getNotificationChannel(AlarmReceiver.CHANNEL) == null) nm.createNotificationChannel(NotificationChannel(AlarmReceiver.CHANNEL, "Pengingat Shift", NotificationManager.IMPORTANCE_HIGH).apply { setSound(null, null); setBypassDnd(false) })
        }
    }
    override fun onDestroy() { ringtone?.stop(); ringtone = null; getSystemService(NotificationManager::class.java).cancel(992); super.onDestroy() }
    override fun onBind(intent: Intent?): IBinder? = null
    companion object { const val ACTION_STOP = "com.dits.myalarm.STOP_SOUND" }
}
