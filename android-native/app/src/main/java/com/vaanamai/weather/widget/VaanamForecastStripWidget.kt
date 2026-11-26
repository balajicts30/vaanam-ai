package com.vaanamai.weather.widget

import android.content.Context
import android.content.Intent
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.Image
import androidx.glance.LocalContext
import androidx.glance.ImageProvider
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.action.actionRunCallback
import androidx.glance.appwidget.action.actionStartActivity
import androidx.glance.appwidget.cornerRadius
import androidx.glance.appwidget.provideContent
import androidx.glance.background
import androidx.glance.layout.Alignment
import androidx.glance.layout.Column
import androidx.glance.layout.Row
import androidx.glance.layout.Spacer
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.fillMaxWidth
import androidx.glance.layout.height
import androidx.glance.layout.padding
import androidx.glance.layout.size
import androidx.glance.layout.width
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider
import com.vaanamai.weather.MainActivity
import com.vaanamai.weather.R
import com.vaanamai.weather.data.local.VaanamPreferences
import com.vaanamai.weather.data.model.WidgetSlotItem
import com.vaanamai.weather.data.model.WidgetWeatherCache
import com.vaanamai.weather.domain.WeatherCodeMapper

class VaanamForecastStripWidget : GlanceAppWidget() {

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val prefs = VaanamPreferences(context)
        val cache = prefs.getWidgetCache()
        provideContent {
            ForecastStripContent(cache = cache)
        }
    }

    @Composable
    private fun ForecastStripContent(cache: WidgetWeatherCache?) {
        val bg = Color(0xFF0B0F17)
        val cardSurface = Color(0xFF131A26)
        val textPrimary = ColorProvider(Color(0xFFF8FAFC))
        val textSecondary = ColorProvider(Color(0xFF94A3B8))
        val skyCyan = ColorProvider(Color(0xFF38BDF8))
        val indigo = ColorProvider(Color(0xFF818CF8))

        val slots: List<WidgetSlotItem> = cache?.slots?.take(4).orEmpty()

        Column(
            modifier = GlanceModifier
                .fillMaxSize()
                .background(bg)
                .cornerRadius(20.dp)
                .padding(14.dp)
                .clickable(actionStartActivity(Intent(LocalContext.current, MainActivity::class.java)))
        ) {
            // Top Row: City, Current Temp, Condition + Refresh icon
            Row(
                modifier = GlanceModifier.fillMaxWidth(),
                verticalAlignment = Alignment.Vertical.CenterVertically
            ) {
                Column(modifier = GlanceModifier.defaultWeight()) {
                    Row(verticalAlignment = Alignment.Vertical.CenterVertically) {
                        Text(
                            text = cache?.cityName ?: "Chennai",
                            style = TextStyle(
                                color = textPrimary,
                                fontSize = 15.sp,
                                fontWeight = FontWeight.Bold
                            ),
                            maxLines = 1
                        )
                        Spacer(modifier = GlanceModifier.width(8.dp))
                        Text(
                            text = if (cache != null) "${cache.currentTempC}° • ${cache.conditionLabel}" else "Tap to sync",
                            style = TextStyle(
                                color = skyCyan,
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Medium
                            ),
                            maxLines = 1
                        )
                    }
                    Spacer(modifier = GlanceModifier.height(2.dp))
                    Text(
                        text = cache?.aiOneLiner ?: "Open Vaanam AI to sync live ECMWF forecast.",
                        style = TextStyle(
                            color = indigo,
                            fontSize = 11.sp
                        ),
                        maxLines = 1
                    )
                }

                Image(
                    provider = ImageProvider(R.drawable.ic_widget_refresh),
                    contentDescription = "Refresh",
                    modifier = GlanceModifier
                        .size(20.dp)
                        .clickable(actionRunCallback<RefreshWidgetActionCallback>())
                )
            }

            Spacer(modifier = GlanceModifier.height(10.dp))

            // Bottom Strip: Next 4 three-hour forecast slots
            Row(
                modifier = GlanceModifier
                    .fillMaxWidth()
                    .background(cardSurface)
                    .cornerRadius(14.dp)
                    .padding(horizontal = 8.dp, vertical = 8.dp),
                verticalAlignment = Alignment.Vertical.CenterVertically
            ) {
                if (slots.isEmpty()) {
                    Text(
                        text = "Forecast strip updates automatically every 30 min",
                        style = TextStyle(color = textSecondary, fontSize = 11.sp),
                        modifier = GlanceModifier.padding(4.dp)
                    )
                } else {
                    slots.forEach { slot ->
                        Column(
                            modifier = GlanceModifier.defaultWeight(),
                            horizontalAlignment = Alignment.Horizontal.CenterHorizontally
                        ) {
                            Text(
                                text = slot.label,
                                style = TextStyle(color = textSecondary, fontSize = 10.sp),
                                maxLines = 1
                            )
                            Text(
                                text = WeatherCodeMapper.widgetGlyph(slot.weatherCode, true),
                                style = TextStyle(color = skyCyan, fontSize = 16.sp)
                            )
                            Text(
                                text = "${slot.tempC}°",
                                style = TextStyle(
                                    color = textPrimary,
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            )
                            Text(
                                text = "${slot.rainProbability}%",
                                style = TextStyle(color = skyCyan, fontSize = 10.sp)
                            )
                        }
                    }
                }
            }
        }
    }
}

class VaanamForecastWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = VaanamForecastStripWidget()
}
