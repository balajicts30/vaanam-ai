package com.vaanamai.weather.domain

import com.vaanamai.weather.data.model.AiWeatherBrief
import com.vaanamai.weather.data.model.CityLocation
import com.vaanamai.weather.data.model.HourlyForecastItem
import com.vaanamai.weather.data.model.ModelConsensus
import kotlin.math.roundToInt

object AiWeatherSynthesizer {

    fun synthesize(
        city: CityLocation,
        currentTempC: Double,
        humidity: Int,
        windKmh: Double,
        isDay: Boolean,
        isRainingNow: Boolean,
        cloudCover: Int,
        hourlyNext24: List<HourlyForecastItem>,
        consensus: ModelConsensus
    ): AiWeatherBrief {
        val next12 = hourlyNext24.take(12)
        val peakRainSlot = next12.maxByOrNull { it.rainProbability }
        val peakRainProb = peakRainSlot?.rainProbability ?: 0
        val peakWind = next12.maxOfOrNull { it.windKmh } ?: windKmh

        val tempFeel = when {
            currentTempC >= 35.0 -> "Hot"
            currentTempC >= 30.0 -> "Warm"
            currentTempC >= 24.0 -> "Mild"
            else -> "Cool"
        }
        val humidityFeel = when {
            humidity >= 75 -> "humid"
            humidity >= 55 -> "moderate-humidity"
            else -> "dry"
        }
        val dayPeriod = if (isDay) "day" else "evening"

        val shortSummary = when {
            isRainingNow -> {
                "Active rainfall in ${city.name} right now; winds near ${windKmh.roundToInt()} km/h with ${consensus.agreementLabel.lowercase()} model consensus."
            }
            peakRainProb >= 55 && peakRainSlot != null -> {
                "$tempFeel & $humidityFeel $dayPeriod; ${peakRainProb}% chance of showers around ${peakRainSlot.label}."
            }
            peakRainProb >= 30 && peakRainSlot != null -> {
                "$tempFeel & dry right now; passing clouds with a ${peakRainProb}% shower chance near ${peakRainSlot.label}."
            }
            cloudCover <= 25 && isDay -> {
                "Bright, shining skies in ${city.name} right now; staying mostly dry through the next 12 hours."
            }
            else -> {
                "$tempFeel & $humidityFeel $dayPeriod with ${cloudCover}% cloud cover and low rain risk."
            }
        }

        val rainWindowHint = when {
            isRainingNow -> "Precipitation is currently active over ${city.name}."
            peakRainProb >= 40 && peakRainSlot != null ->
                "Highest rain probability (${peakRainProb}%) is projected around ${peakRainSlot.label}."
            else -> "No significant rain window expected in the next 12 hours."
        }

        val comfortAdvisory = when {
            currentTempC >= 35.0 -> "High heat stress — stay hydrated and avoid prolonged midday sun."
            isRainingNow || peakRainProb >= 55 -> "Keep light rain protection handy if travelling outdoors."
            peakWind >= 28.0 -> "Breezy stretches up to ${peakWind.roundToInt()} km/h expected; coastal areas may feel gustier."
            else -> "Comfortable window for outdoor plans and travel."
        }

        val detailedBrief = buildString {
            append(shortSummary)
            append(" ")
            append(rainWindowHint)
            append(" ECMWF IFS (${consensus.ecmwfTempC.roundToInt()}°C) and GFS (${consensus.gfsTempC.roundToInt()}°C) show ")
            append("${consensus.confidencePercent}% consensus (${consensus.agreementLabel}).")
        }

        return AiWeatherBrief(
            shortSummary = shortSummary,
            detailedBrief = detailedBrief,
            rainWindowHint = rainWindowHint,
            comfortAdvisory = comfortAdvisory
        )
    }
}
