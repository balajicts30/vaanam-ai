package com.vaanamai.weather

import android.app.Application
import com.vaanamai.weather.widget.WeatherRefreshWorker

class VaanamApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        WeatherRefreshWorker.schedulePeriodic(this)
    }
}
