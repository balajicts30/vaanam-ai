package com.vaanamai.weather.data.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class CityLocation(
    val id: String,
    val name: String,
    val state: String = "",
    val country: String = "India",
    val latitude: Double,
    val longitude: Double,
    val timezone: String = "Asia/Kolkata"
)

object PresetCities {
    val defaultCity = CityLocation(
        id = "chennai",
        name = "Chennai",
        state = "Tamil Nadu",
        country = "India",
        latitude = 13.0827,
        longitude = 80.2707,
        timezone = "Asia/Kolkata"
    )

    val all: List<CityLocation> = listOf(
        defaultCity,
        CityLocation("tambaram", "Tambaram", "Tamil Nadu", "India", 12.9249, 80.1000),
        CityLocation("mahabalipuram", "Mahabalipuram", "Tamil Nadu", "India", 12.6269, 80.1927),
        CityLocation("coimbatore", "Coimbatore", "Tamil Nadu", "India", 11.0168, 76.9558),
        CityLocation("madurai", "Madurai", "Tamil Nadu", "India", 9.9252, 78.1198),
        CityLocation("bengaluru", "Bengaluru", "Karnataka", "India", 12.9716, 77.5946),
        CityLocation("mumbai", "Mumbai", "Maharashtra", "India", 19.0760, 72.8777),
        CityLocation("new-delhi", "New Delhi", "Delhi", "India", 28.6139, 77.2090)
    )
}

@Serializable
data class OpenMeteoForecastResponse(
    val latitude: Double = 0.0,
    val longitude: Double = 0.0,
    val timezone: String = "Asia/Kolkata",
    val current: OpenMeteoCurrentDto? = null,
    val hourly: OpenMeteoHourlyDto? = null,
    val daily: OpenMeteoDailyDto? = null
)

@Serializable
data class OpenMeteoCurrentDto(
    val time: String = "",
    @SerialName("temperature_2m") val temperature2m: Double = 0.0,
    @SerialName("apparent_temperature") val apparentTemperature: Double = 0.0,
    @SerialName("relative_humidity_2m") val relativeHumidity2m: Int = 0,
    @SerialName("is_day") val isDay: Int = 1,
    val precipitation: Double = 0.0,
    val rain: Double = 0.0,
    val showers: Double = 0.0,
    @SerialName("weather_code") val weatherCode: Int = 0,
    @SerialName("cloud_cover") val cloudCover: Int = 0,
    @SerialName("pressure_msl") val pressureMsl: Double = 1013.0,
    @SerialName("wind_speed_10m") val windSpeed10m: Double = 0.0,
    @SerialName("wind_direction_10m") val windDirection10m: Int = 0
)

@Serializable
data class OpenMeteoHourlyDto(
    val time: List<String> = emptyList(),
    @SerialName("temperature_2m") val temperature2m: List<Double?> = emptyList(),
    @SerialName("dew_point_2m") val dewPoint2m: List<Double?> = emptyList(),
    @SerialName("precipitation_probability") val precipitationProbability: List<Int?> = emptyList(),
    val precipitation: List<Double?> = emptyList(),
    @SerialName("weather_code") val weatherCode: List<Int?> = emptyList(),
    @SerialName("wind_speed_10m") val windSpeed10m: List<Double?> = emptyList(),
    @SerialName("uv_index") val uvIndex: List<Double?> = emptyList(),
    @SerialName("cloud_cover") val cloudCover: List<Int?> = emptyList()
)

@Serializable
data class OpenMeteoDailyDto(
    val time: List<String> = emptyList(),
    @SerialName("weather_code") val weatherCode: List<Int?> = emptyList(),
    @SerialName("temperature_2m_max") val temperature2mMax: List<Double?> = emptyList(),
    @SerialName("temperature_2m_min") val temperature2mMin: List<Double?> = emptyList(),
    @SerialName("precipitation_sum") val precipitationSum: List<Double?> = emptyList(),
    @SerialName("precipitation_probability_max") val precipitationProbabilityMax: List<Int?> = emptyList(),
    @SerialName("uv_index_max") val uvIndexMax: List<Double?> = emptyList(),
    @SerialName("wind_speed_10m_max") val windSpeed10mMax: List<Double?> = emptyList()
)

@Serializable
data class GeocodingResponse(
    val results: List<GeocodingResultDto> = emptyList()
)

@Serializable
data class GeocodingResultDto(
    val id: Long = 0,
    val name: String = "",
    val admin1: String? = null,
    val country: String? = null,
    val latitude: Double = 0.0,
    val longitude: Double = 0.0,
    val timezone: String? = null
)

@Serializable
data class HourlyForecastItem(
    val timeIso: String,
    val label: String,
    val tempC: Double,
    val weatherCode: Int,
    val rainProbability: Int,
    val precipMm: Double,
    val windKmh: Double
)

@Serializable
data class DailyForecastItem(
    val dateIso: String,
    val dayLabel: String,
    val weatherCode: Int,
    val minTempC: Double,
    val maxTempC: Double,
    val rainProbability: Int,
    val precipSumMm: Double
)

@Serializable
data class ModelConsensus(
    val ecmwfTempC: Double,
    val gfsTempC: Double,
    val ecmwfRain24hMm: Double,
    val gfsRain24hMm: Double,
    val confidencePercent: Int,
    val agreementLabel: String,
    val summaryNote: String
)

@Serializable
data class AiWeatherBrief(
    val shortSummary: String,
    val detailedBrief: String,
    val rainWindowHint: String,
    val comfortAdvisory: String
)

@Serializable
data class WeatherSnapshot(
    val city: CityLocation,
    val updatedAtMillis: Long,
    val updatedTimeLabel: String,
    val currentTempC: Double,
    val feelsLikeC: Double,
    val highTempC: Double,
    val lowTempC: Double,
    val weatherCode: Int,
    val isDay: Boolean,
    val isRainingNow: Boolean,
    val livePrecipitationMm: Double,
    val humidityPercent: Int,
    val windSpeedKmh: Double,
    val windDirectionDeg: Int,
    val pressureHpa: Double,
    val dewPointC: Double,
    val uvIndex: Double,
    val cloudCoverPercent: Int,
    val hourlyNext24: List<HourlyForecastItem>,
    val daily16: List<DailyForecastItem>,
    val consensus: ModelConsensus,
    val aiBrief: AiWeatherBrief
)

@Serializable
data class WidgetSlotItem(
    val label: String,
    val tempC: Int,
    val weatherCode: Int,
    val rainProbability: Int
)

@Serializable
data class WidgetWeatherCache(
    val cityName: String,
    val latitude: Double,
    val longitude: Double,
    val currentTempC: Int,
    val highTempC: Int,
    val lowTempC: Int,
    val weatherCode: Int,
    val isDay: Boolean,
    val conditionLabel: String,
    val aiOneLiner: String,
    val updatedTimeLabel: String,
    val slots: List<WidgetSlotItem>
)
