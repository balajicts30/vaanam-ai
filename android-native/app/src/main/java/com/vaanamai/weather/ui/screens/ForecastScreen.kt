package com.vaanamai.weather.ui.screens

import androidx.compose.animation.animateContentSize
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.AutoAwesome
import androidx.compose.material.icons.rounded.DarkMode
import androidx.compose.material.icons.rounded.ExpandLess
import androidx.compose.material.icons.rounded.ExpandMore
import androidx.compose.material.icons.rounded.KeyboardArrowDown
import androidx.compose.material.icons.rounded.LightMode
import androidx.compose.material.icons.rounded.LocationOn
import androidx.compose.material.icons.rounded.Refresh
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.vaanamai.weather.data.model.CityLocation
import com.vaanamai.weather.data.model.DailyForecastItem
import com.vaanamai.weather.data.model.HourlyForecastItem
import com.vaanamai.weather.data.model.PresetCities
import com.vaanamai.weather.data.model.WeatherSnapshot
import com.vaanamai.weather.domain.WeatherCodeMapper
import com.vaanamai.weather.ui.theme.ConsensusIndigo
import com.vaanamai.weather.ui.theme.HeroTemperatureStyle
import com.vaanamai.weather.ui.theme.RainTeal
import com.vaanamai.weather.ui.theme.SkyCyan
import com.vaanamai.weather.ui.theme.WarmAmber

@Composable
fun ForecastScreen(
    snapshot: WeatherSnapshot,
    selectedCity: CityLocation,
    useFahrenheit: Boolean,
    useLightTheme: Boolean,
    onOpenCityPicker: () -> Unit,
    onSelectQuickCity: (CityLocation) -> Unit,
    onOpenAiBrief: () -> Unit,
    onRefresh: () -> Unit,
    onToggleUnit: () -> Unit,
    onToggleTheme: () -> Unit
) {
    var showExtended16Days by remember { mutableStateOf(false) }

    val dailyList = if (showExtended16Days) snapshot.daily16 else snapshot.daily16.take(7)
    val globalMin = snapshot.daily16.minOfOrNull { it.minTempC } ?: 20.0
    val globalMax = snapshot.daily16.maxOfOrNull { it.maxTempC } ?: 38.0

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(horizontal = 20.dp, vertical = 16.dp),
        verticalArrangement = Arrangement.spacedBy(20.dp)
    ) {
        // 1. Top Minimal Bar
        item {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Surface(
                        shape = RoundedCornerShape(20.dp),
                        color = MaterialTheme.colorScheme.surface,
                        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
                        modifier = Modifier.clickable { onOpenCityPicker() }
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Rounded.LocationOn,
                                contentDescription = null,
                                tint = SkyCyan,
                                modifier = Modifier.size(16.dp)
                            )
                            Text(
                                text = selectedCity.name,
                                style = MaterialTheme.typography.titleMedium,
                                color = MaterialTheme.colorScheme.onSurface
                            )
                            Icon(
                                imageVector = Icons.Rounded.KeyboardArrowDown,
                                contentDescription = "Change city",
                                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.size(18.dp)
                            )
                        }
                    }

                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Surface(
                            shape = RoundedCornerShape(12.dp),
                            color = MaterialTheme.colorScheme.surfaceVariant,
                            modifier = Modifier.clickable { onToggleUnit() }
                        ) {
                            Text(
                                text = if (useFahrenheit) "°F" else "°C",
                                style = MaterialTheme.typography.labelLarge,
                                color = SkyCyan,
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp)
                            )
                        }
                        IconButton(onClick = onToggleTheme) {
                            Icon(
                                imageVector = if (useLightTheme) Icons.Rounded.DarkMode else Icons.Rounded.LightMode,
                                contentDescription = "Toggle theme",
                                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.size(20.dp)
                            )
                        }
                        IconButton(onClick = onRefresh) {
                            Icon(
                                imageVector = Icons.Rounded.Refresh,
                                contentDescription = "Refresh weather",
                                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.size(20.dp)
                            )
                        }
                    }
                }

                // Live timestamp + Model badge
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(7.dp)
                            .clip(CircleShape)
                            .background(RainTeal)
                    )
                    Text(
                        text = "ECMWF IFS • Live • ${snapshot.updatedTimeLabel}",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }

                // Quick-switch city chips
                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(PresetCities.all) { city ->
                        val active = city.name.equals(selectedCity.name, ignoreCase = true)
                        Surface(
                            shape = RoundedCornerShape(14.dp),
                            color = if (active) SkyCyan.copy(alpha = 0.16f) else MaterialTheme.colorScheme.surfaceVariant,
                            border = BorderStroke(
                                1.dp,
                                if (active) SkyCyan.copy(alpha = 0.7f) else MaterialTheme.colorScheme.outline
                            ),
                            modifier = Modifier.clickable { onSelectQuickCity(city) }
                        ) {
                            Text(
                                text = city.name,
                                style = MaterialTheme.typography.labelMedium,
                                color = if (active) SkyCyan else MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                            )
                        }
                    }
                }
            }
        }

        // 2. Hero Weather Section
        item {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 8.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    Icon(
                        imageVector = WeatherCodeMapper.icon(snapshot.weatherCode, snapshot.isDay),
                        contentDescription = WeatherCodeMapper.label(snapshot.weatherCode, snapshot.isDay),
                        tint = SkyCyan,
                        modifier = Modifier.size(60.dp)
                    )
                    Text(
                        text = WeatherCodeMapper.formatTemp(snapshot.currentTempC, useFahrenheit),
                        style = HeroTemperatureStyle,
                        color = MaterialTheme.colorScheme.onBackground
                    )
                }

                Text(
                    text = WeatherCodeMapper.label(snapshot.weatherCode, snapshot.isDay),
                    style = MaterialTheme.typography.titleLarge,
                    color = MaterialTheme.colorScheme.onBackground
                )

                Text(
                    text = "Feels like ${WeatherCodeMapper.formatTemp(snapshot.feelsLikeC, useFahrenheit)}  •  H: ${WeatherCodeMapper.formatTemp(snapshot.highTempC, useFahrenheit)}  L: ${WeatherCodeMapper.formatTemp(snapshot.lowTempC, useFahrenheit)}",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }

        // 3. AI Weather Analyst Pill
        item {
            Surface(
                shape = RoundedCornerShape(20.dp),
                color = MaterialTheme.colorScheme.surface,
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { onOpenAiBrief() }
            ) {
                Column(
                    modifier = Modifier.padding(18.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Rounded.AutoAwesome,
                                contentDescription = null,
                                tint = ConsensusIndigo,
                                modifier = Modifier.size(16.dp)
                            )
                            Text(
                                text = "AI WEATHER ANALYST",
                                style = MaterialTheme.typography.labelMedium,
                                color = ConsensusIndigo,
                                fontWeight = FontWeight.SemiBold
                            )
                        }
                        Text(
                            text = "${snapshot.consensus.confidencePercent}% consensus →",
                            style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }

                    Text(
                        text = snapshot.aiBrief.shortSummary,
                        style = MaterialTheme.typography.bodyLarge,
                        color = MaterialTheme.colorScheme.onSurface,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }
        }

        // 4. Hourly Forecast Strip (Next 24 Hours)
        item {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text(
                    text = "Next 24 Hours",
                    style = MaterialTheme.typography.titleMedium,
                    color = MaterialTheme.colorScheme.onBackground
                )
                LazyRow(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    items(snapshot.hourlyNext24) { hour ->
                        HourlyPillCard(item = hour, useFahrenheit = useFahrenheit)
                    }
                }
            }
        }

        // 5. 7-Day & Expandable 16-Day Outlook
        item {
            Surface(
                shape = RoundedCornerShape(20.dp),
                color = MaterialTheme.colorScheme.surface,
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
                modifier = Modifier
                    .fillMaxWidth()
                    .animateContentSize()
            ) {
                Column(
                    modifier = Modifier.padding(18.dp),
                    verticalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = if (showExtended16Days) "16-Day Extended Outlook" else "7-Day Forecast",
                            style = MaterialTheme.typography.titleMedium,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        Surface(
                            shape = RoundedCornerShape(12.dp),
                            color = MaterialTheme.colorScheme.surfaceVariant,
                            modifier = Modifier.clickable { showExtended16Days = !showExtended16Days }
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(4.dp)
                            ) {
                                Text(
                                    text = if (showExtended16Days) "7 Days" else "16 Days",
                                    style = MaterialTheme.typography.labelMedium,
                                    color = SkyCyan
                                )
                                Icon(
                                    imageVector = if (showExtended16Days) Icons.Rounded.ExpandLess else Icons.Rounded.ExpandMore,
                                    contentDescription = null,
                                    tint = SkyCyan,
                                    modifier = Modifier.size(16.dp)
                                )
                            }
                        }
                    }

                    dailyList.forEach { day ->
                        DailyForecastRow(
                            item = day,
                            globalMin = globalMin,
                            globalMax = globalMax,
                            useFahrenheit = useFahrenheit
                        )
                    }
                }
            }
        }

        item { Spacer(modifier = Modifier.height(12.dp)) }
    }
}

@Composable
private fun HourlyPillCard(
    item: HourlyForecastItem,
    useFahrenheit: Boolean
) {
    Surface(
        shape = RoundedCornerShape(18.dp),
        color = MaterialTheme.colorScheme.surface,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
        modifier = Modifier.width(72.dp)
    ) {
        Column(
            modifier = Modifier.padding(vertical = 14.dp, horizontal = 8.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Text(
                text = item.label,
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 1
            )
            Icon(
                imageVector = WeatherCodeMapper.icon(item.weatherCode, true),
                contentDescription = null,
                tint = if (item.rainProbability > 40) RainTeal else SkyCyan,
                modifier = Modifier.size(22.dp)
            )
            Text(
                text = WeatherCodeMapper.formatTemp(item.tempC, useFahrenheit),
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.onSurface
            )

            // Subtle precipitation probability bar when > 15%
            if (item.rainProbability > 15) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(3.dp)
                ) {
                    Text(
                        text = "${item.rainProbability}%",
                        style = MaterialTheme.typography.labelMedium,
                        color = SkyCyan
                    )
                    Box(
                        modifier = Modifier
                            .width(36.dp)
                            .height(3.dp)
                            .clip(RoundedCornerShape(2.dp))
                            .background(MaterialTheme.colorScheme.surfaceVariant)
                    ) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth(item.rainProbability / 100f)
                                .height(3.dp)
                                .background(SkyCyan)
                        )
                    }
                }
            } else {
                Spacer(modifier = Modifier.height(18.dp))
            }
        }
    }
}

@Composable
private fun DailyForecastRow(
    item: DailyForecastItem,
    globalMin: Double,
    globalMax: Double,
    useFahrenheit: Boolean
) {
    val span = (globalMax - globalMin).coerceAtLeast(1.0)
    val startFraction = ((item.minTempC - globalMin) / span).toFloat().coerceIn(0f, 0.85f)
    val endFraction = ((item.maxTempC - globalMin) / span).toFloat().coerceIn(startFraction + 0.12f, 1f)

    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        Text(
            text = item.dayLabel,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurface,
            modifier = Modifier.width(86.dp),
            maxLines = 1
        )
        Icon(
            imageVector = WeatherCodeMapper.icon(item.weatherCode, true),
            contentDescription = null,
            tint = if (item.rainProbability > 40) RainTeal else SkyCyan,
            modifier = Modifier.size(20.dp)
        )
        Text(
            text = if (item.rainProbability > 10) "${item.rainProbability}%" else "",
            style = MaterialTheme.typography.labelMedium,
            color = SkyCyan,
            modifier = Modifier.width(34.dp)
        )
        Text(
            text = WeatherCodeMapper.formatTemp(item.minTempC, useFahrenheit),
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.width(32.dp)
        )
        Box(
            modifier = Modifier
                .weight(1f)
                .height(6.dp)
                .clip(RoundedCornerShape(4.dp))
                .background(MaterialTheme.colorScheme.surfaceVariant)
        ) {
            Row(modifier = Modifier.fillMaxSize()) {
                if (startFraction > 0f) {
                    Spacer(modifier = Modifier.weight(startFraction))
                }
                Box(
                    modifier = Modifier
                        .weight((endFraction - startFraction).coerceAtLeast(0.1f))
                        .height(6.dp)
                        .clip(RoundedCornerShape(4.dp))
                        .background(
                            Brush.horizontalGradient(listOf(SkyCyan, WarmAmber))
                        )
                )
                if (endFraction < 1f) {
                    Spacer(modifier = Modifier.weight(1f - endFraction))
                }
            }
        }
        Text(
            text = WeatherCodeMapper.formatTemp(item.maxTempC, useFahrenheit),
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = FontWeight.SemiBold,
            color = MaterialTheme.colorScheme.onSurface,
            modifier = Modifier.width(34.dp)
        )
    }
}
