package com.dits.myalarm.data

data class Alarm(
    val id: String,
    val date: String, // yyyy-MM-dd, local device date
    val shift: String,
    val start: String,
    val end: String,
    val enabled: Boolean = true
)
