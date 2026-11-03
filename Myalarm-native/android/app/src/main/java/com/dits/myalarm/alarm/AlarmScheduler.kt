package com.dits.myalarm.alarm

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import com.dits.myalarm.data.Alarm
import java.time.LocalDateTime
import java.time.LocalTime
import java.time.ZoneId

object AlarmScheduler {
    fun schedule(context: Context, alarm: Alarm) {
        if (!alarm.enabled || alarm.shift == "LIBUR") return
        val manager = context.getSystemService(AlarmManager::class.java)
        val at = LocalDateTime.parse("${alarm.date}T${alarm.start}:00").atZone(ZoneId.systemDefault()).toInstant().toEpochMilli()
        if (at <= System.currentTimeMillis()) return
        val intent = Intent(context, AlarmReceiver::class.java).putExtra("alarmId", alarm.id).putExtra("repeat", 0)
        val pi = PendingIntent.getBroadcast(context, alarm.id.hashCode(), intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        if (Build.VERSION.SDK_INT >= 31 && !manager.canScheduleExactAlarms()) return
        manager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi)
    }
    fun cancel(context: Context, alarm: Alarm) {
        val pi = PendingIntent.getBroadcast(context, alarm.id.hashCode(), Intent(context, AlarmReceiver::class.java), PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        context.getSystemService(AlarmManager::class.java).cancel(pi)
    }
    fun rescheduleAll(context: Context) { com.dits.myalarm.data.AlarmStore(context).all().forEach { schedule(context, it) } }
}
