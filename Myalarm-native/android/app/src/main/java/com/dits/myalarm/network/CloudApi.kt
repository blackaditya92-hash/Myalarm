package com.dits.myalarm.network

import com.dits.myalarm.data.Alarm
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

/** Cloudflare Worker client. Set API base URL in the app's cloud settings before using sync. */
class CloudApi(private val baseUrl: String, private val token: String? = null) {
    private fun request(path: String, method: String, body: String? = null): String {
        val c = (URL(baseUrl.trimEnd('/') + path).openConnection() as HttpURLConnection)
        c.requestMethod = method; c.connectTimeout = 12000; c.readTimeout = 12000
        c.setRequestProperty("Content-Type", "application/json")
        token?.let { c.setRequestProperty("Authorization", "Bearer $it") }
        if (body != null) { c.doOutput = true; c.outputStream.use { it.write(body.toByteArray()) } }
        val stream = if (c.responseCode in 200..299) c.inputStream else c.errorStream
        val result = stream.bufferedReader().use { it.readText() }
        if (c.responseCode !in 200..299) error("Cloud API ${c.responseCode}: $result")
        c.disconnect(); return result
    }
    fun register(email: String, password: String) = JSONObject(request("/api/register", "POST", JSONObject().put("email", email).put("password", password).toString())).getString("token")
    fun login(email: String, password: String) = JSONObject(request("/api/login", "POST", JSONObject().put("email", email).put("password", password).toString())).getString("token")
    fun getAlarms(): List<Alarm> {
        val a = JSONObject(request("/api/alarms", "GET")).getJSONArray("alarms")
        return (0 until a.length()).map { i -> val o = a.getJSONObject(i); Alarm(o.getString("id"),o.getString("date"),o.getString("shift"),o.optString("start"),o.optString("end"),o.optBoolean("enabled",true)) }
    }
    fun putAlarms(alarms: List<Alarm>) {
        val a = JSONArray(); alarms.forEach { x -> a.put(JSONObject().put("id",x.id).put("date",x.date).put("shift",x.shift).put("start",x.start).put("end",x.end).put("enabled",x.enabled)) }
        request("/api/alarms", "PUT", JSONObject().put("alarms", a).toString())
    }
}
