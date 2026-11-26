package com.vaanamai.weather.ui.components

import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.RectF
import android.graphics.Shader
import android.graphics.Typeface
import androidx.core.content.FileProvider
import com.vaanamai.weather.data.model.WeatherSnapshot
import com.vaanamai.weather.domain.WeatherCodeMapper
import java.io.File
import java.io.FileOutputStream
import kotlin.math.roundToInt

object ShareCardRenderer {

    fun createStoryBitmap(snapshot: WeatherSnapshot, useFahrenheit: Boolean): Bitmap {
        val width = 1080
        val height = 1920
        val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)

        // Background gradient (#0B0F17 -> #131A26)
        val bgPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            shader = LinearGradient(
                0f, 0f, width.toFloat(), height.toFloat(),
                intArrayOf(Color.parseColor("#0B0F17"), Color.parseColor("#111B2E"), Color.parseColor("#0B0F17")),
                floatArrayOf(0f, 0.5f, 1f),
                Shader.TileMode.CLAMP
            )
        }
        canvas.drawRect(0f, 0f, width.toFloat(), height.toFloat(), bgPaint)

        // Subtle cyan atmospheric glow
        val glowPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.argb(36, 56, 189, 248)
        }
        canvas.drawCircle(width * 0.82f, height * 0.22f, 380f, glowPaint)

        // Top Brand Pill
        val cardPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.parseColor("#131A26") }
        val borderPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.parseColor("#1E293B")
            style = Paint.Style.STROKE
            strokeWidth = 3f
        }
        val headerRect = RectF(72f, 96f, width - 72f, 200f)
        canvas.drawRoundRect(headerRect, 32f, 32f, cardPaint)
        canvas.drawRoundRect(headerRect, 32f, 32f, borderPaint)

        val cyanPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.parseColor("#38BDF8")
            textSize = 34f
            typeface = Typeface.create(Typeface.SANS_SERIF, Typeface.BOLD)
        }
        canvas.drawText("VAANAM AI", 112f, 160f, cyanPaint)

        val mutedRightPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.parseColor("#94A3B8")
            textSize = 28f
            textAlign = Paint.Align.RIGHT
            typeface = Typeface.SANS_SERIF
        }
        canvas.drawText("ECMWF IFS • ${snapshot.updatedTimeLabel}", width - 112f, 158f, mutedRightPaint)

        // City Name
        val cityPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.parseColor("#F8FAFC")
            textSize = 92f
            typeface = Typeface.create(Typeface.SANS_SERIF, Typeface.BOLD)
        }
        canvas.drawText(snapshot.city.name, 76f, 380f, cityPaint)

        val regionPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.parseColor("#94A3B8")
            textSize = 36f
            typeface = Typeface.SANS_SERIF
        }
        val regionText = listOf(snapshot.city.state, snapshot.city.country).filter { it.isNotBlank() }.joinToString(", ")
        canvas.drawText(regionText, 78f, 438f, regionPaint)

        // Hero Temperature
        val heroPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.parseColor("#F8FAFC")
            textSize = 240f
            typeface = Typeface.create(Typeface.SANS_SERIF, Typeface.NORMAL)
        }
        canvas.drawText(WeatherCodeMapper.formatTemp(snapshot.currentTempC, useFahrenheit), 72f, 710f, heroPaint)

        val condPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.parseColor("#38BDF8")
            textSize = 48f
            typeface = Typeface.create(Typeface.SANS_SERIF, Typeface.BOLD)
        }
        canvas.drawText(WeatherCodeMapper.label(snapshot.weatherCode, snapshot.isDay), 78f, 790f, condPaint)

        val hiLoPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.parseColor("#94A3B8")
            textSize = 36f
            typeface = Typeface.SANS_SERIF
        }
        canvas.drawText(
            "Feels ${WeatherCodeMapper.formatTemp(snapshot.feelsLikeC, useFahrenheit)}  •  H: ${WeatherCodeMapper.formatTemp(snapshot.highTempC, useFahrenheit)}  L: ${WeatherCodeMapper.formatTemp(snapshot.lowTempC, useFahrenheit)}",
            78f,
            855f,
            hiLoPaint
        )

        // AI Weather Analyst Card
        val aiRect = RectF(72f, 940f, width - 72f, 1280f)
        canvas.drawRoundRect(aiRect, 40f, 40f, cardPaint)
        canvas.drawRoundRect(aiRect, 40f, 40f, borderPaint)

        val indigoPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.parseColor("#818CF8")
            textSize = 30f
            typeface = Typeface.create(Typeface.SANS_SERIF, Typeface.BOLD)
        }
        canvas.drawText("✦ AI WEATHER ANALYST", 116f, 1015f, indigoPaint)

        val bodyPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.parseColor("#F8FAFC")
            textSize = 38f
            typeface = Typeface.SANS_SERIF
        }
        drawWrappedText(canvas, snapshot.aiBrief.shortSummary, 116f, 1085f, width - 232f, 54f, bodyPaint)

        // Bottom Metrics Strip
        val metricsRect = RectF(72f, 1340f, width - 72f, 1590f)
        canvas.drawRoundRect(metricsRect, 40f, 40f, cardPaint)
        canvas.drawRoundRect(metricsRect, 40f, 40f, borderPaint)

        val cols = listOf(
            "HUMIDITY" to "${snapshot.humidityPercent}%",
            "WIND" to "${snapshot.windSpeedKmh.roundToInt()} km/h",
            "CONSENSUS" to "${snapshot.consensus.confidencePercent}%"
        )
        val colW = (width - 144f) / 3f
        cols.forEachIndexed { idx, (label, value) ->
            val cx = 72f + colW * idx + colW / 2f
            val lblP = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = Color.parseColor("#94A3B8")
                textSize = 26f
                textAlign = Paint.Align.CENTER
                typeface = Typeface.create(Typeface.SANS_SERIF, Typeface.BOLD)
            }
            val valP = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = Color.parseColor("#F8FAFC")
                textSize = 54f
                textAlign = Paint.Align.CENTER
                typeface = Typeface.create(Typeface.SANS_SERIF, Typeface.BOLD)
            }
            canvas.drawText(label, cx, 1435f, lblP)
            canvas.drawText(value, cx, 1515f, valP)
        }

        // Footer
        val footerPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.parseColor("#94A3B8")
            textSize = 28f
            textAlign = Paint.Align.CENTER
        }
        canvas.drawText("Vaanam AI • Real Data. Clear Forecasts.", width / 2f, height - 110f, footerPaint)

        return bitmap
    }

    fun shareStoryBitmap(context: Context, snapshot: WeatherSnapshot, useFahrenheit: Boolean) {
        val bitmap = createStoryBitmap(snapshot, useFahrenheit)
        val dir = File(context.cacheDir, "vaanam_cards").apply { mkdirs() }
        val file = File(dir, "vaanam-story-${snapshot.city.name.lowercase().replace(" ", "-")}.png")
        FileOutputStream(file).use { out ->
            bitmap.compress(Bitmap.CompressFormat.PNG, 95, out)
        }
        val uri = FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", file)
        val shareIntent = Intent(Intent.ACTION_SEND).apply {
            type = "image/png"
            putExtra(Intent.EXTRA_STREAM, uri)
            putExtra(Intent.EXTRA_TEXT, "${snapshot.city.name} Weather via Vaanam AI: ${snapshot.aiBrief.shortSummary}")
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        context.startActivity(Intent.createChooser(shareIntent, "Share Vaanam Story"))
    }

    private fun drawWrappedText(
        canvas: Canvas,
        text: String,
        x: Float,
        startY: Float,
        maxWidth: Float,
        lineHeight: Float,
        paint: Paint
    ) {
        val words = text.split(" ")
        var line = ""
        var y = startY
        var lines = 0
        for (word in words) {
            val test = if (line.isEmpty()) word else "$line $word"
            if (paint.measureText(test) > maxWidth && line.isNotEmpty()) {
                canvas.drawText(line, x, y, paint)
                line = word
                y += lineHeight
                lines++
                if (lines >= 3) break
            } else {
                line = test
            }
        }
        if (line.isNotEmpty() && lines < 3) {
            canvas.drawText(line, x, y, paint)
        }
    }
}
