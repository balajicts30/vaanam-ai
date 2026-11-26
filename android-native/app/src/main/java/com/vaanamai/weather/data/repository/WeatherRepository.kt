package com.vaanamai.weather.data.repository

import com.vaanamai.weather.data.local.VaanamPreferences
import com.vaanamai.weather.data.model.CityLocation
import com.vaanamai.weather.data.model.DailyForecastItem
import com.vaanamai.weather.data.model.HourlyForecastItem
import com.vaanamai.weather.data.model.ModelConsensus
import com.vaanamai.weather.data.model.WeatherSnapshot
import com.vaanamai.weather.data.model.WidgetSlotItem
import com.vaanamai.weather.data.model.WidgetWeatherCache
import com.vaanamai.weather.data.remote.NetworkModule
import com.vaanamai.weather.domain.AiWeatherSynthesizer
import com.vaanamai.weather.domain.WeatherCodeMapper
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import java.time.Instant
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale
import kotlin.math.abs
import kotlin.math.max
import kotlin.math.roundToInt

class WeatherRepository(private val preferences: VaanamPreferences) {

    private val forecastApi = NetworkModule.forecastApi
    private val geocodingApi = NetworkModule.geocodingApi

    suspend fun searchCities(query: String): List<CityLocation> {
        val trimmed = query.trim()
        if (trimmed.length < 2) return emptyList()
        val response = geocodingApi.searchCity(trimmed)
        return response.results.map { r ->
            CityLocation(
                id = "om-${r.id}",
                name = r.name,
                state = r.admin1.orEmpty(),
                country = r.country.orEmpty(),
                latitude = r.latitude,
                longitude = r.longitude,
                timezone = r.timezone ?: "auto"
            )
        }
    }

    suspend fun fetchWeather(city: CityLocation): WeatherSnapshot = coroutineScope {
        // 1. Live Present-Sky Nowcast + 16-day hourly/daily seamless (for accurate present sky & rain probabilities)
        val liveNowDeferred = async {
            forecastApi.getForecast(
                latitude = city.latitude,
                longitude = city.longitude,
                timezone = "auto",
                forecastDays = 16,
                current = "temperature_2m,apparent_temperature,relative_humidity_2m,is_day,precipitation,rain,showers,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m",
                hourly = "temperature_2m,dew_point_2m,precipitation_probability,precipitation,weather_code,wind_speed_10m,uv_index,cloud_cover",
                daily = "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,uv_index_max,wind_speed_10m_max"
            )
        }

        // 2. ECMWF IFS 0.25° primary model
        val ecmwfDeferred = async {
            runCatching {
                forecastApi.getForecast(
                    latitude = city.latitude,
                    longitude = city.longitude,
                    timezone = "auto",
                    forecastDays = 3,
                    models = "ecmwf_ifs025",
                    current = "temperature_2m,precipitation",
                    hourly = "temperature_2m,precipitation"
                )
            }.getOrNull()
        }

        // 3. NOAA GFS model for multi-model consensus comparison
        val gfsDeferred = async {
            runCatching {
                forecastApi.getForecast(
                    latitude = city.latitude,
                    longitude = city.longitude,
                    timezone = "auto",
                    forecastDays = 3,
                    models = "gfs_seamless",
                    current = "temperature_2m,precipitation",
                    hourly = "temperature_2m,precipitation"
                )
            }.getOrNull()
        }

        val liveRes = liveNowDeferred.await()
        val ecmwfRes = ecmwfDeferred.await()
        val gfsRes = gfsDeferred.await()

        val cur = liveRes.current
        val liveLiquidMm = max(cur?.precipitation ?: 0.0, max(cur?.rain ?: 0.0, cur?.showers ?: 0.0))
        val isRainingNow = liveLiquidMm >= 0.15
        val cloudCover = cur?.cloudCover ?: 25
        val isDay = (cur?.isDay ?: 1) == 1
        val rawCode = cur?.weatherCode ?: 1

        // Strict Present-Sky Rule: If 0.0 mm right now, never show rain icons for current conditions
        val verifiedCode = if (!isRainingNow && rawCode in 51..99) {
            when {
                cloudCover <= 20 -> 0
                cloudCover <= 45 -> 1
                cloudCover <= 75 -> 2
                else -> 3
            }
        } else {
            rawCode
        }

        val resolvedCity = city.copy(
            timezone = liveRes.timezone.ifBlank { city.timezone }
        )

        // Parse next 24 hours starting from current local hour
        val hDto = liveRes.hourly
        val curPrefix = (cur?.time ?: "").take(13)
        val startIdx = hDto?.time?.indexOfFirst { it.take(13) >= curPrefix }?.coerceAtLeast(0) ?: 0
        val hourlyNext24 = buildList {
            if (hDto != null) {
                val endIdx = minOf(hDto.time.size, startIdx + 24)
                for (i in startIdx until endIdx) {
                    val iso = hDto.time[i]
                    add(
                        HourlyForecastItem(
                            timeIso = iso,
                            label = if (i == startIdx) "Now" else formatHourLabel(iso),
                            tempC = hDto.temperature2m.getOrNull(i) ?: (cur?.temperature2m ?: 28.0),
                            weatherCode = hDto.weatherCode.getOrNull(i) ?: verifiedCode,
                            rainProbability = hDto.precipitationProbability.getOrNull(i) ?: 0,
                            precipMm = hDto.precipitation.getOrNull(i) ?: 0.0,
                            windKmh = hDto.windSpeed10m.getOrNull(i) ?: (cur?.windSpeed10m ?: 0.0)
                        )
                    )
                }
            }
        }

        // Parse 16-day daily forecast
        val dDto = liveRes.daily
        val daily16 = buildList {
            if (dDto != null) {
                for (i in dDto.time.indices) {
                    val iso = dDto.time[i]
                    add(
                        DailyForecastItem(
                            dateIso = iso,
                            dayLabel = if (i == 0) "Today" else formatDayLabel(iso),
                            weatherCode = dDto.weatherCode.getOrNull(i) ?: 2,
                            minTempC = dDto.temperature2mMin.getOrNull(i) ?: 24.0,
                            maxTempC = dDto.temperature2mMax.getOrNull(i) ?: 32.0,
                            rainProbability = dDto.precipitationProbabilityMax.getOrNull(i) ?: 0,
                            precipSumMm = dDto.precipitationSum.getOrNull(i) ?: 0.0
                        )
                    )
                }
            }
        }

        val currentTempC = cur?.temperature2m ?: hourlyNext24.firstOrNull()?.tempC ?: 29.0
        val ecmwfTemp = ecmwfRes?.current?.temperature2m ?: currentTempC
        val gfsTemp = gfsRes?.current?.temperature2m ?: currentTempC
        val ecmwfRain24 = ecmwfRes?.hourly?.precipitation?.take(24)?.filterNotNull()?.sum()
            ?: hourlyNext24.sumOf { it.precipMm }
        val gfsRain24 = gfsRes?.hourly?.precipitation?.take(24)?.filterNotNull()?.sum()
            ?: ecmwfRain24

        val tempDiff = abs(ecmwfTemp - gfsTemp)
        val rainDiff = abs(ecmwfRain24 - gfsRain24)
        val confidence = (100.0 - (tempDiff * 11.0).coerceAtMost(35.0) - (rainDiff * 1.8).coerceAtMost(30.0))
            .roundToInt()
            .coerceIn(35, 98)

        val agreementLabel = when {
            confidence >= 80 -> "High Agreement"
            confidence >= 60 -> "Moderate Agreement"
            else -> "Low Agreement"
        }

        val consensus = ModelConsensus(
            ecmwfTempC = ecmwfTemp,
            gfsTempC = gfsTemp,
            ecmwfRain24hMm = ecmwfRain24,
            gfsRain24hMm = gfsRain24,
            confidencePercent = confidence,
            agreementLabel = agreementLabel,
            summaryNote = "ECMWF IFS 0.25° vs NOAA GFS 24h comparison (Δ${String.format(Locale.US, "%.1f", tempDiff)}°C temp, Δ${String.format(Locale.US, "%.1f", rainDiff)} mm rain)."
        )

        val aiBrief = AiWeatherSynthesizer.synthesize(
            city = resolvedCity,
            currentTempC = currentTempC,
            humidity = cur?.relativeHumidity2m ?: 65,
            windKmh = cur?.windSpeed10m ?: 10.0,
            isDay = isDay,
            isRainingNow = isRainingNow,
            cloudCover = cloudCover,
            hourlyNext24 = hourlyNext24,
            consensus = consensus
        )

        val nowMillis = System.currentTimeMillis()
        val updatedLabel = formatUpdatedTime(nowMillis, resolvedCity.timezone)

        val snapshot = WeatherSnapshot(
            city = resolvedCity,
            updatedAtMillis = nowMillis,
            updatedTimeLabel = updatedLabel,
            currentTempC = currentTempC,
            feelsLikeC = cur?.apparentTemperature ?: currentTempC,
            highTempC = daily16.firstOrNull()?.maxTempC ?: currentTempC,
            lowTempC = daily16.firstOrNull()?.minTempC ?: currentTempC,
            weatherCode = verifiedCode,
            isDay = isDay,
            isRainingNow = isRainingNow,
            livePrecipitationMm = liveLiquidMm,
            humidityPercent = cur?.relativeHumidity2m ?: 65,
            windSpeedKmh = cur?.windSpeed10m ?: 0.0,
            windDirectionDeg = cur?.windDirection10m ?: 0,
            pressureHpa = cur?.pressureMsl ?: 1012.0,
            dewPointC = hDto?.dewPoint2m?.getOrNull(startIdx) ?: (currentTempC - 4.0),
            uvIndex = hDto?.uvIndex?.getOrNull(startIdx) ?: (dDto?.uvIndexMax?.firstOrNull() ?: 0.0),
            cloudCoverPercent = cloudCover,
            hourlyNext24 = hourlyNext24,
            daily16 = daily16,
            consensus = consensus,
            aiBrief = aiBrief
        )

        // Persist lightweight cache for Glance home screen widgets
        val widgetSlots = listOf(3, 6, 9, 12).mapNotNull { offset ->
            hourlyNext24.getOrNull(offset)?.let { item ->
                WidgetSlotItem(
                    label = item.label,
                    tempC = item.tempC.roundToInt(),
                    weatherCode = item.weatherCode,
                    rainProbability = item.rainProbability
                )
            }
        }
        preferences.saveWidgetCache(
            WidgetWeatherCache(
                cityName = resolvedCity.name,
                latitude = resolvedCity.latitude,
                longitude = resolvedCity.longitude,
                currentTempC = snapshot.currentTempC.roundToInt(),
                highTempC = snapshot.highTempC.roundToInt(),
                lowTempC = snapshot.lowTempC.roundToInt(),
                weatherCode = snapshot.weatherCode,
                isDay = snapshot.isDay,
                conditionLabel = WeatherCodeMapper.label(snapshot.weatherCode, snapshot.isDay),
                aiOneLiner = aiBrief.shortSummary,
                updatedTimeLabel = updatedLabel,
                slots = widgetSlots
            )
        )

        snapshot
    }

    private fun formatHourLabel(iso: String): String = runCatching {
        val dt = LocalDateTime.parse(iso)
        dt.format(DateTimeFormatter.ofPattern("h a", Locale.US))
    }.getOrDefault(iso.takeLast(5))

    private fun formatDayLabel(iso: String): String = runCatching {
        val date = LocalDate.parse(iso)
        date.format(DateTimeFormatter.ofPattern("EEE, d MMM", Locale.US))
    }.getOrDefault(iso)

    private fun formatUpdatedTime(millis: Long, timezone: String): String = runCatching {
        val zone = if (timezone == "auto") ZoneId.systemDefault() else ZoneId.of(timezone)
        Instant.ofEpochMilli(millis).atZone(zone)
            .format(DateTimeFormatter.ofPattern("h:mm a", Locale.US))
    }.getOrDefault("Live")
}
