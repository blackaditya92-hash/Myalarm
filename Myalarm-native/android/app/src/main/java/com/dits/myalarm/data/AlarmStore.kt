package com.dits.myalarm.data

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

class AlarmStore(context: Context) {
    private val prefs = context.getSharedPreferences("myalarm_local", Context.MODE_PRIVATE)
    init {
        if (!prefs.contains("alarms")) {
            val initial = listOf(
                Alarm("seed-2026-10-29", "2026-10-29", "PAGI", "04:30", "05:25"),
                Alarm("seed-2026-10-30", "2026-10-30", "PAGI", "04:30", "05:25"),
                Alarm("seed-2026-10-31", "2026-10-31", "PAGI", "04:30", "05:25"),
                Alarm("seed-2026-11-01", "2026-11-01", "PAGI", "04:30", "05:25"),
                Alarm("seed-2026-11-02", "2026-11-02", "LIBUR", "", ""),
                Alarm("seed-2026-11-03", "2026-11-03", "PAGI", "04:30", "05:25"),
                Alarm("seed-2026-11-04", "2026-11-04", "PAGI", "04:30", "05:25"),
                Alarm("seed-2026-11-05", "2026-11-05", "PAGI", "04:30", "05:25"),
                Alarm("seed-2026-11-06", "2026-11-06", "PAGI", "04:30", "05:25"),
                Alarm("seed-2026-11-07", "2026-11-07", "PAGI", "04:30", "05:25"),
                Alarm("seed-2026-11-08", "2026-11-08", "PAGI", "04:30", "05:25")
            )
            save(initial)
        }
    }
    fun all(): List<Alarm> {
        val raw = prefs.getString("alarms", "[]") ?: "[]"
        return runCatching {
            val a = JSONArray(raw); (0 until a.length()).map { i ->
                val o = a.getJSONObject(i)
                Alarm(o.getString("id"), o.getString("date"), o.getString("shift"), o.optString("start"), o.optString("end"), o.optBoolean("enabled", true))
            }.sortedBy { it.date }
        }.getOrDefault(emptyList())
    }
    fun save(items: List<Alarm>) {
        val a = JSONArray(); items.forEach { x -> a.put(JSONObject().put("id",x.id).put("date",x.date).put("shift",x.shift).put("start",x.start).put("end",x.end).put("enabled",x.enabled)) }
        prefs.edit().putString("alarms", a.toString()).apply()
    }
    fun upsert(item: Alarm) { save(all().filterNot { it.id == item.id || it.date == item.date } + item) }
    fun delete(id: String) = save(all().filterNot { it.id == id })
    fun byId(id: String) = all().firstOrNull { it.id == id }
}
