package com.dits.myalarm.update

import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

object UpdateChecker {
    data class Result(val latestVersion: String, val releaseUrl: String, val updateAvailable: Boolean)
    fun check(currentVersion: String): Result {
        val c = URL("https://api.github.com/repos/blackaditya92-hash/Myalarm/releases/latest").openConnection() as HttpURLConnection
        c.connectTimeout = 10000; c.readTimeout = 10000
        c.setRequestProperty("Accept", "application/vnd.github+json")
        val body = c.inputStream.bufferedReader().use { it.readText() }; c.disconnect()
        val json = JSONObject(body); val tag = json.optString("tag_name").removePrefix("v")
        val latest = tag.split('.').map { it.toIntOrNull() ?: 0 }
        val current = currentVersion.split('.').map { it.toIntOrNull() ?: 0 }
        val newer = (0 until maxOf(latest.size,current.size)).firstNotNullOfOrNull { i ->
            val a=latest.getOrElse(i){0}; val b=current.getOrElse(i){0}; if(a!=b) a>b else null
        } ?: false
        return Result(tag,json.optString("html_url"),newer)
    }
}
