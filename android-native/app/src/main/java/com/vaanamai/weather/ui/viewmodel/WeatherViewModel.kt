package com.vaanamai.weather.ui.viewmodel

import android.app.Application
import android.location.Geocoder
import androidx.glance.appwidget.updateAll
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.vaanamai.weather.data.local.VaanamPreferences
import com.vaanamai.weather.data.model.CityLocation
import com.vaanamai.weather.data.model.PresetCities
import com.vaanamai.weather.data.model.WeatherSnapshot
import com.vaanamai.weather.data.repository.WeatherRepository
import com.vaanamai.weather.widget.VaanamForecastStripWidget
import com.vaanamai.weather.widget.VaanamMinimalWidget
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.util.Locale

data class WeatherUiState(
    val selectedCity: CityLocation = PresetCities.defaultCity,
    val snapshot: WeatherSnapshot? = null,
    val isLoading: Boolean = true,
    val errorMessage: String? = null,
    val useFahrenheit: Boolean = false,
    val useLightTheme: Boolean = false,
    val searchResults: List<CityLocation> = emptyList(),
    val isSearching: Boolean = false
)

class WeatherViewModel(application: Application) : AndroidViewModel(application) {

    private val preferences = VaanamPreferences(application)
    private val repository = WeatherRepository(preferences)

    private val _uiState = MutableStateFlow(WeatherUiState())
    val uiState: StateFlow<WeatherUiState> = _uiState.asStateFlow()

    private var searchJob: Job? = null

    init {
        viewModelScope.launch {
            preferences.useFahrenheitFlow.collect { useF ->
                _uiState.update { it.copy(useFahrenheit = useF) }
            }
        }
        viewModelScope.launch {
            preferences.useLightThemeFlow.collect { useLight ->
                _uiState.update { it.copy(useLightTheme = useLight) }
            }
        }
        viewModelScope.launch {
            val savedCity = preferences.getSelectedCity()
            _uiState.update { it.copy(selectedCity = savedCity) }
            refreshWeather(savedCity)
        }
    }

    fun selectCity(city: CityLocation) {
        viewModelScope.launch {
            preferences.saveSelectedCity(city)
            _uiState.update { it.copy(selectedCity = city, searchResults = emptyList()) }
            refreshWeather(city)
        }
    }

    fun selectCoordinates(latitude: Double, longitude: Double) {
        viewModelScope.launch {
            val resolvedName = withContext(Dispatchers.IO) {
                runCatching {
                    @Suppress("DEPRECATION")
                    val addresses = Geocoder(getApplication(), Locale.getDefault())
                        .getFromLocation(latitude, longitude, 1)
                    val addr = addresses?.firstOrNull()
                    addr?.locality ?: addr?.subAdminArea ?: addr?.adminArea
                }.getOrNull()
            } ?: "My Location"

            val city = CityLocation(
                id = "gps-${String.format(Locale.US, "%.2f", latitude)}-${String.format(Locale.US, "%.2f", longitude)}",
                name = resolvedName,
                country = "GPS",
                latitude = latitude,
                longitude = longitude,
                timezone = "auto"
            )
            selectCity(city)
        }
    }

    fun refreshWeather(city: CityLocation = _uiState.value.selectedCity) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, errorMessage = null) }
            runCatching {
                repository.fetchWeather(city)
            }.onSuccess { snap ->
                _uiState.update {
                    it.copy(
                        selectedCity = snap.city,
                        snapshot = snap,
                        isLoading = false,
                        errorMessage = null
                    )
                }
                // Sync both Jetpack Glance home screen widgets immediately
                runCatching {
                    VaanamMinimalWidget().updateAll(getApplication())
                    VaanamForecastStripWidget().updateAll(getApplication())
                }
            }.onFailure { err ->
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        errorMessage = err.localizedMessage ?: "Unable to fetch live weather data."
                    )
                }
            }
        }
    }

    fun searchCities(query: String) {
        searchJob?.cancel()
        if (query.trim().length < 2) {
            _uiState.update { it.copy(searchResults = emptyList(), isSearching = false) }
            return
        }
        searchJob = viewModelScope.launch {
            delay(300)
            _uiState.update { it.copy(isSearching = true) }
            val results = runCatching { repository.searchCities(query) }.getOrDefault(emptyList())
            _uiState.update { it.copy(searchResults = results, isSearching = false) }
        }
    }

    fun toggleTemperatureUnit() {
        viewModelScope.launch {
            preferences.setUseFahrenheit(!_uiState.value.useFahrenheit)
        }
    }

    fun toggleTheme() {
        viewModelScope.launch {
            preferences.setUseLightTheme(!_uiState.value.useLightTheme)
        }
    }
}
