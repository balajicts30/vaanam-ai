package com.vaanamai.weather.data.local

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.vaanamai.weather.data.model.CityLocation
import com.vaanamai.weather.data.model.PresetCities
import com.vaanamai.weather.data.model.WidgetWeatherCache
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

private val Context.vaanamDataStore: DataStore<Preferences> by preferencesDataStore(
    name = "vaanam_ai_prefs"
)

class VaanamPreferences(private val context: Context) {
    private val json = Json { ignoreUnknownKeys = true }

    companion object {
        private val KEY_SELECTED_CITY = stringPreferencesKey("selected_city_json")
        private val KEY_USE_FAHRENHEIT = booleanPreferencesKey("use_fahrenheit")
        private val KEY_USE_LIGHT_THEME = booleanPreferencesKey("use_light_theme")
        private val KEY_WIDGET_CACHE = stringPreferencesKey("widget_weather_cache_json")
    }

    val selectedCityFlow: Flow<CityLocation> = context.vaanamDataStore.data.map { prefs ->
        prefs[KEY_SELECTED_CITY]?.let {
            runCatching { json.decodeFromString<CityLocation>(it) }.getOrNull()
        } ?: PresetCities.defaultCity
    }

    val useFahrenheitFlow: Flow<Boolean> = context.vaanamDataStore.data.map { prefs ->
        prefs[KEY_USE_FAHRENHEIT] ?: false
    }

    val useLightThemeFlow: Flow<Boolean> = context.vaanamDataStore.data.map { prefs ->
        prefs[KEY_USE_LIGHT_THEME] ?: false
    }

    val widgetCacheFlow: Flow<WidgetWeatherCache?> = context.vaanamDataStore.data.map { prefs ->
        prefs[KEY_WIDGET_CACHE]?.let {
            runCatching { json.decodeFromString<WidgetWeatherCache>(it) }.getOrNull()
        }
    }

    suspend fun getSelectedCity(): CityLocation = selectedCityFlow.first()

    suspend fun saveSelectedCity(city: CityLocation) {
        context.vaanamDataStore.edit { prefs ->
            prefs[KEY_SELECTED_CITY] = json.encodeToString(city)
        }
    }

    suspend fun setUseFahrenheit(useFahrenheit: Boolean) {
        context.vaanamDataStore.edit { prefs ->
            prefs[KEY_USE_FAHRENHEIT] = useFahrenheit
        }
    }

    suspend fun setUseLightTheme(useLight: Boolean) {
        context.vaanamDataStore.edit { prefs ->
            prefs[KEY_USE_LIGHT_THEME] = useLight
        }
    }

    suspend fun saveWidgetCache(cache: WidgetWeatherCache) {
        context.vaanamDataStore.edit { prefs ->
            prefs[KEY_WIDGET_CACHE] = json.encodeToString(cache)
        }
    }

    suspend fun getWidgetCache(): WidgetWeatherCache? = widgetCacheFlow.first()
}
