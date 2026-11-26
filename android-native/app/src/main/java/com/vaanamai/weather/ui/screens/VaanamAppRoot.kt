package com.vaanamai.weather.ui.screens

import android.Manifest
import android.annotation.SuppressLint
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.AutoAwesome
import androidx.compose.material.icons.rounded.Radar
import androidx.compose.material.icons.rounded.Share
import androidx.compose.material.icons.rounded.WbSunny
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.google.android.gms.location.LocationServices
import com.vaanamai.weather.ui.components.AiBriefBottomSheet
import com.vaanamai.weather.ui.components.CitySearchBottomSheet
import com.vaanamai.weather.ui.theme.SkyCyan
import com.vaanamai.weather.ui.theme.VaanamTheme
import com.vaanamai.weather.ui.viewmodel.WeatherViewModel

@SuppressLint("MissingPermission")
@Composable
fun VaanamAppRoot(viewModel: WeatherViewModel) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    val context = LocalContext.current

    var selectedTab by remember { mutableIntStateOf(0) }
    var showCityPicker by remember { mutableStateOf(false) }
    var showAiBrief by remember { mutableStateOf(false) }

    val requestLastLocation = {
        val fused = LocationServices.getFusedLocationProviderClient(context)
        fused.lastLocation.addOnSuccessListener { loc ->
            if (loc != null) {
                viewModel.selectCoordinates(loc.latitude, loc.longitude)
            }
        }
    }

    val permissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestMultiplePermissions()
    ) { perms ->
        val granted = perms[Manifest.permission.ACCESS_FINE_LOCATION] == true ||
            perms[Manifest.permission.ACCESS_COARSE_LOCATION] == true
        if (granted) requestLastLocation()
    }

    val onLocateMe = {
        val hasFine = ContextCompat.checkSelfPermission(
            context, Manifest.permission.ACCESS_FINE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED
        val hasCoarse = ContextCompat.checkSelfPermission(
            context, Manifest.permission.ACCESS_COARSE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED

        if (hasFine || hasCoarse) {
            requestLastLocation()
        } else {
            permissionLauncher.launch(
                arrayOf(
                    Manifest.permission.ACCESS_FINE_LOCATION,
                    Manifest.permission.ACCESS_COARSE_LOCATION
                )
            )
        }
    }

    VaanamTheme(darkTheme = !state.useLightTheme) {
        Scaffold(
            containerColor = MaterialTheme.colorScheme.background,
            bottomBar = {
                NavigationBar(
                    containerColor = MaterialTheme.colorScheme.surface,
                    tonalElevation = 0.dp
                ) {
                    val tabs = listOf(
                        Triple("Forecast", Icons.Rounded.WbSunny, 0),
                        Triple("Models & Radar", Icons.Rounded.Radar, 1),
                        Triple("Share Card", Icons.Rounded.Share, 2)
                    )
                    tabs.forEach { (label, icon, idx) ->
                        NavigationBarItem(
                            selected = selectedTab == idx,
                            onClick = { selectedTab = idx },
                            icon = { Icon(imageVector = icon, contentDescription = label) },
                            label = { Text(label, style = MaterialTheme.typography.labelMedium) },
                            colors = NavigationBarItemDefaults.colors(
                                selectedIconColor = SkyCyan,
                                selectedTextColor = SkyCyan,
                                indicatorColor = SkyCyan.copy(alpha = 0.14f),
                                unselectedIconColor = MaterialTheme.colorScheme.onSurfaceVariant,
                                unselectedTextColor = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        )
                    }
                }
            }
        ) { innerPadding ->
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding)
            ) {
                val snap = state.snapshot
                when {
                    snap == null && state.isLoading -> {
                        Column(
                            modifier = Modifier.align(Alignment.Center),
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            CircularProgressIndicator(color = SkyCyan)
                            Text(
                                text = "Syncing live ECMWF forecast...",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }

                    snap == null && state.errorMessage != null -> {
                        Column(
                            modifier = Modifier
                                .align(Alignment.Center)
                                .padding(24.dp),
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            Icon(Icons.Rounded.AutoAwesome, contentDescription = null, tint = SkyCyan)
                            Text(
                                text = state.errorMessage ?: "Unable to load weather",
                                style = MaterialTheme.typography.bodyLarge,
                                color = MaterialTheme.colorScheme.onBackground
                            )
                            Button(
                                onClick = { viewModel.refreshWeather() },
                                shape = RoundedCornerShape(14.dp)
                            ) {
                                Text("Retry")
                            }
                        }
                    }

                    snap != null -> {
                        when (selectedTab) {
                            0 -> ForecastScreen(
                                snapshot = snap,
                                selectedCity = state.selectedCity,
                                useFahrenheit = state.useFahrenheit,
                                useLightTheme = state.useLightTheme,
                                onOpenCityPicker = { showCityPicker = true },
                                onSelectQuickCity = { viewModel.selectCity(it) },
                                onOpenAiBrief = { showAiBrief = true },
                                onRefresh = { viewModel.refreshWeather() },
                                onToggleUnit = { viewModel.toggleTemperatureUnit() },
                                onToggleTheme = { viewModel.toggleTheme() }
                            )
                            1 -> ModelsRadarScreen(
                                snapshot = snap,
                                useFahrenheit = state.useFahrenheit
                            )
                            2 -> ShareCardScreen(
                                snapshot = snap,
                                useFahrenheit = state.useFahrenheit
                            )
                        }
                    }
                }
            }
        }

        if (showCityPicker) {
            CitySearchBottomSheet(
                selectedCity = state.selectedCity,
                searchResults = state.searchResults,
                isSearching = state.isSearching,
                onQueryChange = { viewModel.searchCities(it) },
                onSelectCity = { viewModel.selectCity(it) },
                onLocateMe = onLocateMe,
                onDismiss = { showCityPicker = false }
            )
        }

        if (showAiBrief && state.snapshot != null) {
            AiBriefBottomSheet(
                snapshot = state.snapshot!!,
                useFahrenheit = state.useFahrenheit,
                onDismiss = { showAiBrief = false }
            )
        }
    }
}
