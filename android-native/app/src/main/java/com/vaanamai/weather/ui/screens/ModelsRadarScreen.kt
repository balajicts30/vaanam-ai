package com.vaanamai.weather.ui.screens

import android.annotation.SuppressLint
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import com.vaanamai.weather.data.model.WeatherSnapshot
import com.vaanamai.weather.domain.WeatherCodeMapper
import com.vaanamai.weather.ui.theme.ConsensusIndigo
import com.vaanamai.weather.ui.theme.RainTeal
import com.vaanamai.weather.ui.theme.SkyCyan
import java.util.Locale
import kotlin.math.roundToInt

@SuppressLint("SetJavaScriptEnabled")
@Composable
fun ModelsRadarScreen(
    snapshot: WeatherSnapshot,
    useFahrenheit: Boolean
) {
    val radarUrl =
        "https://www.rainviewer.com/map.html?loc=${snapshot.city.latitude},${snapshot.city.longitude},7&oFa=0&oC=0&oU=0&oCS=1&oF=0&oAP=1&c=3&o=83&lm=1&layer=radar&sm=1&sn=1"

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(horizontal = 20.dp, vertical = 16.dp),
        verticalArrangement = Arrangement.spacedBy(18.dp)
    ) {
        item {
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(
                    text = "Models & Live Radar",
                    style = MaterialTheme.typography.headlineMedium,
                    color = MaterialTheme.colorScheme.onBackground
                )
                Text(
                    text = "${snapshot.city.name} • ECMWF IFS 0.25° vs NOAA GFS",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }

        // Model Consensus Card
        item {
            Surface(
                shape = RoundedCornerShape(20.dp),
                color = MaterialTheme.colorScheme.surface,
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier.padding(18.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "Model Consensus",
                            style = MaterialTheme.typography.titleMedium,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        Text(
                            text = "${snapshot.consensus.confidencePercent}% • ${snapshot.consensus.agreementLabel}",
                            style = MaterialTheme.typography.labelLarge,
                            color = ConsensusIndigo,
                            fontWeight = FontWeight.SemiBold
                        )
                    }

                    LinearProgressIndicator(
                        progress = { snapshot.consensus.confidencePercent / 100f },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(7.dp)
                            .clip(RoundedCornerShape(4.dp)),
                        color = ConsensusIndigo,
                        trackColor = MaterialTheme.colorScheme.surfaceVariant
                    )

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        ModelStatTile(
                            title = "ECMWF IFS 0.25°",
                            temp = WeatherCodeMapper.formatTemp(snapshot.consensus.ecmwfTempC, useFahrenheit),
                            rain = "${String.format(Locale.US, "%.1f", snapshot.consensus.ecmwfRain24hMm)} mm / 24h",
                            accent = SkyCyan,
                            modifier = Modifier.weight(1f)
                        )
                        ModelStatTile(
                            title = "NOAA GFS",
                            temp = WeatherCodeMapper.formatTemp(snapshot.consensus.gfsTempC, useFahrenheit),
                            rain = "${String.format(Locale.US, "%.1f", snapshot.consensus.gfsRain24hMm)} mm / 24h",
                            accent = RainTeal,
                            modifier = Modifier.weight(1f)
                        )
                    }

                    Text(
                        text = snapshot.consensus.summaryNote,
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }

        // Interactive Live Precipitation Radar WebView
        item {
            Surface(
                shape = RoundedCornerShape(20.dp),
                color = MaterialTheme.colorScheme.surface,
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "Live Precipitation Radar",
                            style = MaterialTheme.typography.titleMedium,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        Text(
                            text = if (snapshot.isRainingNow) "Rain Active" else "Dry Overhead",
                            style = MaterialTheme.typography.labelMedium,
                            color = if (snapshot.isRainingNow) SkyCyan else RainTeal
                        )
                    }
                    AndroidView(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(260.dp)
                            .clip(RoundedCornerShape(16.dp)),
                        factory = { ctx ->
                            WebView(ctx).apply {
                                settings.javaScriptEnabled = true
                                settings.domStorageEnabled = true
                                webViewClient = WebViewClient()
                                loadUrl(radarUrl)
                            }
                        },
                        update = { webView ->
                            if (webView.url != radarUrl) {
                                webView.loadUrl(radarUrl)
                            }
                        }
                    )
                }
            }
        }

        // Atmospheric Metrics Grid (2 columns x 3 rows)
        item {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text(
                    text = "Atmospheric Telemetry",
                    style = MaterialTheme.typography.titleMedium,
                    color = MaterialTheme.colorScheme.onBackground
                )
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    MetricTile("Humidity", "${snapshot.humidityPercent}%", "Relative moisture", Modifier.weight(1f))
                    MetricTile("UV Index", String.format(Locale.US, "%.1f", snapshot.uvIndex), "Current peak", Modifier.weight(1f))
                }
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    MetricTile(
                        "Wind",
                        "${snapshot.windSpeedKmh.roundToInt()} km/h",
                        "From ${WeatherCodeMapper.compassDirection(snapshot.windDirectionDeg)}",
                        Modifier.weight(1f)
                    )
                    MetricTile("Pressure", "${snapshot.pressureHpa.roundToInt()} hPa", "Mean sea level", Modifier.weight(1f))
                }
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    MetricTile(
                        "Dew Point",
                        WeatherCodeMapper.formatTemp(snapshot.dewPointC, useFahrenheit),
                        "Comfort threshold",
                        Modifier.weight(1f)
                    )
                    MetricTile("Cloud Cover", "${snapshot.cloudCoverPercent}%", "Live sky fraction", Modifier.weight(1f))
                }
            }
        }
    }
}

@Composable
private fun ModelStatTile(
    title: String,
    temp: String,
    rain: String,
    accent: androidx.compose.ui.graphics.Color,
    modifier: Modifier = Modifier
) {
    Surface(
        shape = RoundedCornerShape(16.dp),
        color = MaterialTheme.colorScheme.background,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
        modifier = modifier
    ) {
        Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(text = title, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Text(text = temp, style = MaterialTheme.typography.headlineMedium, color = accent)
            Text(text = rain, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurface)
        }
    }
}

@Composable
private fun MetricTile(
    label: String,
    value: String,
    sub: String,
    modifier: Modifier = Modifier
) {
    Surface(
        shape = RoundedCornerShape(18.dp),
        color = MaterialTheme.colorScheme.surface,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
        modifier = modifier
    ) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(text = label, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Text(text = value, style = MaterialTheme.typography.titleLarge, color = MaterialTheme.colorScheme.onSurface)
            Text(text = sub, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}
