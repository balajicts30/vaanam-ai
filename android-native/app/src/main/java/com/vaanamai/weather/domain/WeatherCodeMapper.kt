package com.vaanamai.weather.domain

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.AcUnit
import androidx.compose.material.icons.rounded.Cloud
import androidx.compose.material.icons.rounded.FilterDrama
import androidx.compose.material.icons.rounded.Grain
import androidx.compose.material.icons.rounded.NightsStay
import androidx.compose.material.icons.rounded.Thunderstorm
import androidx.compose.material.icons.rounded.WaterDrop
import androidx.compose.material.icons.rounded.WbCloudy
import androidx.compose.material.icons.rounded.WbSunny
import androidx.compose.ui.graphics.vector.ImageVector
import kotlin.math.roundToInt

object WeatherCodeMapper {

    fun label(code: Int, isDay: Boolean = true): String = when (code) {
        0 -> if (isDay) "Clear & Sunny" else "Clear Night"
        1 -> if (isDay) "Mainly Clear" else "Mostly Clear"
        2 -> "Partly Cloudy"
        3 -> "Overcast"
        45, 48 -> "Fog & Mist"
        51, 53, 55 -> "Drizzle"
        61 -> "Light Rain"
        63 -> "Moderate Rain"
        65 -> "Heavy Rain"
        71, 73, 75 -> "Snow"
        80 -> "Light Showers"
        81 -> "Rain Showers"
        82 -> "Heavy Showers"
        95, 96, 99 -> "Thunderstorm"
        else -> "Partly Cloudy"
    }

    fun icon(code: Int, isDay: Boolean = true): ImageVector = when (code) {
        0 -> if (isDay) Icons.Rounded.WbSunny else Icons.Rounded.NightsStay
        1 -> if (isDay) Icons.Rounded.WbSunny else Icons.Rounded.NightsStay
        2 -> Icons.Rounded.WbCloudy
        3 -> Icons.Rounded.Cloud
        45, 48 -> Icons.Rounded.FilterDrama
        51, 53, 55 -> Icons.Rounded.Grain
        61, 63, 65, 80, 81, 82 -> Icons.Rounded.WaterDrop
        71, 73, 75 -> Icons.Rounded.AcUnit
        95, 96, 99 -> Icons.Rounded.Thunderstorm
        else -> Icons.Rounded.WbCloudy
    }

    fun widgetGlyph(code: Int, isDay: Boolean = true): String = when (code) {
        0, 1 -> if (isDay) "☀" else "☾"
        2 -> "⛅"
        3, 45, 48 -> "☁"
        51, 53, 55, 61, 63, 80, 81 -> "☂"
        65, 82 -> "⛈"
        95, 96, 99 -> "⚡"
        else -> "⛅"
    }

    fun formatTemp(tempC: Double, useFahrenheit: Boolean): String {
        val value = if (useFahrenheit) tempC * 9.0 / 5.0 + 32.0 else tempC
        return "${value.roundToInt()}°"
    }

    fun compassDirection(degrees: Int): String {
        val dirs = listOf("N", "NE", "E", "SE", "S", "SW", "W", "NW")
        val index = (((degrees % 360) + 360) % 360 / 45.0).roundToInt() % 8
        return dirs[index]
    }
}
