package com.dits.myalarm.alarm

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.os.Build
import com.dits.myalarm.R
import com.dits.myalarm.data.AlarmStore
import java.time.LocalDateTime
import java.time.ZoneId

class AlarmReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val id = intent.getStringExtra("alarmId") ?: return
        val alarm = AlarmStore(context).byId(id) ?: return
        if (!alarm.enabled || alarm.shift == "LIBUR") return
        val nm = context.getSystemService(NotificationManager::class.java)
        val sound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
        if (Build.VERSION.SDK_INT >= 26 && nm.getNotificationChannel(CHANNEL) == null) {
            val ch = NotificationChannel(CHANNEL, "Pengingat Shift", NotificationManager.IMPORTANCE_HIGH).apply {
                description = "Alarm jadwal kerja Myalarm"
                setSound(null, null)
                enableVibration(true)
                lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
            }
            nm.createNotificationChannel(ch)
        }
        val serviceIntent = Intent(context, AlarmSoundService::class.java).putExtra("alarmId", id)
        if (Build.VERSION.SDK_INT >= 26) context.startForegroundService(serviceIntent) else context.startService(serviceIntent)


        // Repeating reminder every 5 minutes until the configured end time.
        val next = LocalDateTime.now().plusMinutes(5).withSecond(0).withNano(0)
        val end = LocalDateTime.parse("${alarm.date}T${alarm.end}:00")
        if (next.isBefore(end)) {
            val repeatIntent = Intent(context, AlarmReceiver::class.java).putExtra("alarmId", id)
            val pi = PendingIntent.getBroadcast(context, id.hashCode(), repeatIntent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
            val millis = next.atZone(ZoneId.systemDefault()).toInstant().toEpochMilli()
            val am = context.getSystemService(android.app.AlarmManager::class.java)
            if (Build.VERSION.SDK_INT < 31 || am.canScheduleExactAlarms()) am.setExactAndAllowWhileIdle(android.app.AlarmManager.RTC_WAKEUP, millis, pi)
        }
    }
    companion object { const val CHANNEL = "myalarm_shift_alarm" }
}
