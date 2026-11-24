"use client";

import React from "react";
import {
  AlertTriangle,
  ArrowRight,
  CloudRain,
  Droplets,
  Gauge,
  Radio,
  ShieldCheck,
  Sparkles,
  Sun,
  Thermometer,
  Video,
  Wind,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { resolveWeatherPhoto } from "@/lib/photography";
import {
  convertTemp,
  formatDateShort,
  formatHourLabel,
  formatRain,
  formatTemp,
  formatWind,
  windDirectionToCompass,
} from "@/lib/units";
import { getWeatherCodeInfo } from "@/lib/weather-codes";
import {
  NavSection,
  UserSettings,
  WeatherIntelligencePayload,
} from "@/types/weather";

interface Props {
  payload: WeatherIntelligencePayload;
  settings: UserSettings;
  onNavigate: (section: NavSection) => void;
}

export function DashboardView({ payload, settings, onNavigate }: Props) {
  const { location, current, hourly, daily30, alerts, comparison } = payload;
  const curInfo = getWeatherCodeInfo(current.weatherCode);
  const photo = resolveWeatherPhoto(current.weatherCode, current.temperature, location.name);
  const next24 = hourly.slice(0, 24).map((h) => ({
    label: formatHourLabel(h.time, settings.clockFormat),
    temp: convertTemp(h.temperature, settings.tempUnit),
    rainProb: h.rainProbability ?? 0,
    precip: h.precipitation ?? 0,
  }));

  const week1 = daily30.slice(0, 7);
  const today = daily30[0];

  return (
    <div className="space-y-6">
      {/* Hero Current Conditions Card with Attributed Editorial Photography */}
      <div className="relative overflow-hidden rounded-3xl border border-cyan-500/25 shadow-2xl">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30 scale-105"
          style={{ backgroundImage: `url(${photo.url})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#040914]/95 via-[#07152e]/85 to-[#040914]/75" />

        <div className="relative z-10 p-6 lg:p-8 flex flex-col xl:flex-row xl:items-end justify-between gap-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/20 border border-cyan-400/35 text-cyan-200 text-xs font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                LIVE MODEL FEED
              </span>
              <span className="px-2.5 py-1 rounded-full bg-slate-900/70 border border-slate-700/70 text-slate-300 text-xs">
                Confidence: <strong className="text-cyan-300">{payload.dataQuality.overallConfidence}</strong>
              </span>
              <span className="px-2.5 py-1 rounded-full bg-slate-900/70 border border-slate-700/70 text-slate-300 text-xs">
                Model Agreement: <strong className="text-sky-300">{comparison.agreementLevel}</strong>
              </span>
            </div>

            <div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
                {location.name}
              </h1>
              <p className="text-sm text-slate-300 mt-0.5">
                {[location.district, location.state, location.country].filter(Boolean).join(", ")} •{" "}
                <span className="font-mono text-xs text-slate-400">
                  {location.latitude.toFixed(3)}°N, {location.longitude.toFixed(3)}°E
                </span>
              </p>
            </div>

            <div className="flex items-center gap-4 pt-1">
              <span className="text-6xl sm:text-7xl font-extrabold tracking-tighter text-white">
                {formatTemp(current.temperature, settings.tempUnit)}
              </span>
              <div className="space-y-1">
                <div className="text-xl font-semibold text-cyan-200 flex items-center gap-2">
                  <span>{curInfo.emoji}</span>
                  <span>{curInfo.label}</span>
                </div>
                <div className="text-xs text-slate-300">
                  Feels like {formatTemp(current.feelsLike, settings.tempUnit)} • Today{" "}
                  {formatTemp(today?.tempMin, settings.tempUnit)} /{" "}
                  {formatTemp(today?.tempMax, settings.tempUnit)}
                </div>
                <div className="text-[11px] text-slate-400">
                  Source: {current.sourceModel}
                </div>
              </div>
            </div>
          </div>

          {/* Key Telemetry Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 xl:w-[500px]">
            <div className="rounded-2xl bg-slate-950/65 border border-slate-800/90 p-3.5">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 uppercase font-semibold">
                <CloudRain className="w-3.5 h-3.5 text-cyan-400" /> Rain Prob
              </div>
              <div className="text-xl font-bold text-white mt-1">
                {current.rainProbability !== null ? `${current.rainProbability}%` : "—"}
              </div>
              <div className="text-[11px] text-slate-400">
                {formatRain(today?.precipitationSum, settings.rainUnit)} today
              </div>
            </div>

            <div className="rounded-2xl bg-slate-950/65 border border-slate-800/90 p-3.5">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 uppercase font-semibold">
                <Wind className="w-3.5 h-3.5 text-sky-400" /> Wind
              </div>
              <div className="text-xl font-bold text-white mt-1">
                {formatWind(current.windSpeed, settings.windUnit)}
              </div>
              <div className="text-[11px] text-slate-400">
                Dir: {windDirectionToCompass(current.windDirection)}
              </div>
            </div>

            <div className="rounded-2xl bg-slate-950/65 border border-slate-800/90 p-3.5">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 uppercase font-semibold">
                <Droplets className="w-3.5 h-3.5 text-blue-400" /> Humidity
              </div>
              <div className="text-xl font-bold text-white mt-1">
                {current.humidity !== null ? `${current.humidity}%` : "—"}
              </div>
              <div className="text-[11px] text-slate-400">
                Dew {formatTemp(current.dewPoint, settings.tempUnit)}
              </div>
            </div>

            <div className="rounded-2xl bg-slate-950/65 border border-slate-800/90 p-3.5">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 uppercase font-semibold">
                <Gauge className="w-3.5 h-3.5 text-indigo-400" /> Pressure
              </div>
              <div className="text-xl font-bold text-white mt-1">
                {current.pressure !== null ? `${Math.round(current.pressure)}` : "—"}
                <span className="text-xs font-normal text-slate-400"> hPa</span>
              </div>
              <div className="text-[11px] text-slate-400">
                Clouds {current.cloudCover ?? "—"}%
              </div>
            </div>
          </div>
        </div>

        {/* Attribution strip */}
        <div className="relative z-10 px-6 py-2 bg-slate-950/60 border-t border-white/5 flex flex-wrap items-center justify-between text-[10px] text-slate-400 gap-2">
          <span>{photo.disclaimer}</span>
          <span>
            Visual: {photo.title} ({photo.license})
          </span>
        </div>
      </div>

      {/* Quick Action Studio & Intelligence Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => onNavigate("analyst")}
          className="glass-card rounded-2xl p-4 text-left hover:border-cyan-400/50 transition group"
        >
          <div className="flex items-center justify-between">
            <span className="p-2 rounded-xl bg-cyan-500/15 text-cyan-300">
              <Sparkles className="w-5 h-5" />
            </span>
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-300 transition" />
          </div>
          <h3 className="font-semibold text-slate-100 mt-3">AI Weather Analyst</h3>
          <p className="text-xs text-slate-400 mt-1">
            Conversational briefings in English &amp; Tamil grounded strictly in ECMWF &amp; SEAS5 data.
          </p>
        </button>

        <button
          onClick={() => onNavigate("radar")}
          className="glass-card rounded-2xl p-4 text-left hover:border-cyan-400/50 transition group"
        >
          <div className="flex items-center justify-between">
            <span className="p-2 rounded-xl bg-emerald-500/15 text-emerald-300">
              <Radio className="w-5 h-5" />
            </span>
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-300 transition" />
          </div>
          <h3 className="font-semibold text-slate-100 mt-3">Live Weather Radar</h3>
          <p className="text-xs text-slate-400 mt-1">
            Animated RainViewer precipitation radar, IR satellite clouds &amp; Zoom Earth integration.
          </p>
        </button>

        <button
          onClick={() => onNavigate("studio")}
          className="glass-card rounded-2xl p-4 text-left hover:border-cyan-400/50 transition group"
        >
          <div className="flex items-center justify-between">
            <span className="p-2 rounded-xl bg-violet-500/15 text-violet-300">
              <Video className="w-5 h-5" />
            </span>
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-violet-300 transition" />
          </div>
          <h3 className="font-semibold text-slate-100 mt-3">Social Weather Studio</h3>
          <p className="text-xs text-slate-400 mt-1">
            1080×1080 Facebook posts &amp; 10-second animated 1080×1920 MP4 Instagram Stories.
          </p>
        </button>
      </div>

      {/* Active Alerts (Official vs AI Risk Indicators) */}
      {alerts.length > 0 && (
        <div className="glass-card rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Weather Alerts &amp; Intelligence Signals ({alerts.length})
            </h2>
            <span className="text-[11px] text-slate-400">
              Official government warnings are separated from AI model risk indicators
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {alerts.map((al) => {
              const isOfficial = al.origin !== "AI_RISK_INDICATOR";
              return (
                <div
                  key={al.id}
                  className={`rounded-xl p-3.5 border ${
                    isOfficial
                      ? "bg-rose-950/30 border-rose-500/40"
                      : al.severity === "SEVERE" || al.severity === "EXTREME"
                      ? "bg-amber-950/25 border-amber-500/35"
                      : "bg-slate-900/70 border-cyan-500/20"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isOfficial
                          ? "bg-rose-500/25 text-rose-200"
                          : "bg-cyan-500/20 text-cyan-200"
                      }`}
                    >
                      {isOfficial ? "OFFICIAL GOVERNMENT WARNING" : "AI MODEL RISK INDICATOR"}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">{al.severity}</span>
                  </div>
                  <div className="text-sm font-semibold text-slate-100">{al.title}</div>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">{al.description}</p>
                  <div className="text-[10px] text-slate-400 mt-2">{al.source}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 24-Hour Temperature & Rain Probability Chart */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <Thermometer className="w-4 h-4 text-cyan-400" />
                Next 24 Hours — Temperature &amp; Rain Probability
              </h2>
              <p className="text-xs text-slate-400">
                ECMWF IFS 0.25° temperature + ECMWF ENS 51-member precipitation probability
              </p>
            </div>
            <button
              onClick={() => onNavigate("forecast-hour")}
              className="text-xs text-cyan-300 hover:text-cyan-200 font-medium"
            >
              Full Hourly View →
            </button>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={next24} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="dashTempGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="dashRainGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#22d3ee" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
                <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 11 }} interval={2} />
                <YAxis yAxisId="temp" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                <YAxis yAxisId="rain" orientation="right" domain={[0, 100]} tick={{ fill: "#22d3ee", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#071124",
                    borderColor: "rgba(56,189,248,0.3)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Area
                  yAxisId="temp"
                  type="monotone"
                  dataKey="temp"
                  name={`Temp (°${settings.tempUnit})`}
                  stroke="#38bdf8"
                  strokeWidth={2.5}
                  fill="url(#dashTempGrad)"
                />
                <Area
                  yAxisId="rain"
                  type="monotone"
                  dataKey="rainProb"
                  name="Rain Prob (%)"
                  stroke="#22d3ee"
                  strokeWidth={1.8}
                  fill="url(#dashRainGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 7-Day Outlook Strip */}
        <div className="glass-card rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <Sun className="w-4 h-4 text-amber-400" />
                7-Day Forecast
              </h2>
              <button
                onClick={() => onNavigate("forecast-30")}
                className="text-xs text-cyan-300 hover:text-cyan-200 font-medium"
              >
                30-Day Explorer →
              </button>
            </div>
            <div className="space-y-2">
              {week1.map((d) => {
                const info = getWeatherCodeInfo(d.weatherCode);
                const { weekday, dayMonth } = formatDateShort(d.date);
                return (
                  <div
                    key={d.date}
                    className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-950/55 border border-slate-800/70"
                  >
                    <div className="w-20">
                      <div className="text-xs font-semibold text-slate-200">{weekday}</div>
                      <div className="text-[10px] text-slate-400">{dayMonth}</div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-1">
                      <span className="text-base">{info.emoji}</span>
                      <span className="text-xs text-slate-300 truncate">{info.shortLabel}</span>
                    </div>
                    <div className="text-xs text-cyan-300 font-medium w-12 text-right">
                      {d.rainProbability ?? 0}%
                    </div>
                    <div className="text-xs font-semibold text-white w-20 text-right">
                      {formatTemp(d.tempMin, settings.tempUnit)} /{" "}
                      {formatTemp(d.tempMax, settings.tempUnit)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              ECMWF ENS 51-member spread active
            </span>
            <button
              onClick={() => onNavigate("models")}
              className="text-cyan-300 hover:underline"
            >
              Compare Models
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
