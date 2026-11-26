package com.vaanamai.weather.widget

import android.content.Context
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.Image
import androidx.glance.ImageProvider
import androidx.glance.action.actionStartActivity
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.action.actionRunCallback
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
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider
import com.vaanamai.weather.MainActivity
import com.vaanamai.weather.R
import com.vaanamai.weather.data.local.VaanamPreferences
import com.vaanamai.weather.data.model.WidgetWeatherCache
import com.vaanamai.weather.domain.WeatherCodeMapper

class VaanamMinimalWidget : GlanceAppWidget() {

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val prefs = VaanamPreferences(context)
        val cache = prefs.getWidgetCache()
        provideContent {
            MinimalWidgetContent(cache = cache)
        }
    }

    @Composable
    private fun MinimalWidgetContent(cache: WidgetWeatherCache?) {
        val bg = Color(0xFF0B0F17)
        val textPrimary = ColorProvider(Color(0xFFF8FAFC))
        val textSecondary = ColorProvider(Color(0xFF94A3B8))
        val skyCyan = ColorProvider(Color(0xFF38BDF8))

        Column(
            modifier = GlanceModifier
                .fillMaxSize()
                .background(bg)
                .cornerRadius(20.dp)
                .padding(14.dp)
                .clickable(actionStartActivity<MainActivity>()),
            verticalAlignment = Alignment.Vertical.CenterVertically
        ) {
            Row(
                modifier = GlanceModifier.fillMaxWidth(),
                verticalAlignment = Alignment.Vertical.CenterVertically
            ) {
                Text(
                    text = cache?.cityName ?: "Chennai",
                    style = TextStyle(
                        color = textPrimary,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold
                    ),
                    maxLines = 1,
                    modifier = GlanceModifier.defaultWeight()
                )
                Image(
                    provider = ImageProvider(R.drawable.ic_widget_refresh),
                    contentDescription = "Refresh",
                    modifier = GlanceModifier
                        .size(18.dp)
                        .clickable(actionRunCallback<RefreshWidgetActionCallback>())
                )
            }

            Spacer(modifier = GlanceModifier.height(6.dp))

            Row(verticalAlignment = Alignment.Vertical.CenterVertically) {
                Text(
                    text = if (cache != null) "${cache.currentTempC}°" else "--°",
                    style = TextStyle(
                        color = textPrimary,
                        fontSize = 36.sp,
                        fontWeight = FontWeight.Medium
                    )
                )
                Spacer(modifier = GlanceModifier.size(8.dp))
                Text(
                    text = WeatherCodeMapper.widgetGlyph(cache?.weatherCode ?: 1, cache?.isDay ?: true),
                    style = TextStyle(
                        color = skyCyan,
                        fontSize = 24.sp
                    )
                )
            }

            Spacer(modifier = GlanceModifier.height(4.dp))

            Text(
                text = cache?.conditionLabel ?: "Tap to sync",
                style = TextStyle(
                    color = skyCyan,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Medium
                ),
                maxLines = 1
            )

            Text(
                text = if (cache != null) "H:${cache.highTempC}°  L:${cache.lowTempC}°" else "Vaanam AI",
                style = TextStyle(
                    color = textSecondary,
                    fontSize = 11.sp
                ),
                maxLines = 1
            )
        }
    }
}

class VaanamMinimalWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = VaanamMinimalWidget()
}
