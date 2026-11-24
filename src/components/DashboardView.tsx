"use client";

import React from "react";
import {
  AlertTriangle,
  ArrowRight,
  Radio,
  ShieldCheck,
  Sparkles,
  Sun,
  Thermometer,
  Video,
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
import {
  convertTemp,
  formatDateShort,
  formatHourLabel,
  formatTemp,
} from "@/lib/units";
import { getWeatherCodeInfo } from "@/lib/weather-codes";
import {
  NavSection,
  UserSettings,
  WeatherIntelligencePayload,
} from "@/types/weather";
import { WeatherPulseCard } from "./WeatherPulseCard";

interface Props {
  payload: WeatherIntelligencePayload;
  settings: UserSettings;
  onNavigate: (section: NavSection) => void;
}

export function DashboardView({ payload, settings, onNavigate }: Props) {
  const { hourly, daily30, alerts } = payload;
  const next24 = hourly.slice(0, 24).map((h) => ({
    label: formatHourLabel(h.time, settings.clockFormat),
    temp: convertTemp(h.temperature, settings.tempUnit),
    rainProb: h.rainProbability ?? 0,
    precip: h.precipitation ?? 0,
  }));

  const week1 = daily30.slice(0, 7);

  return (
    <div className="space-y-6">
      {/* Main VAANAM AI Weather Pulse Card with Integrated Upcoming Weather Timeline */}
      <WeatherPulseCard payload={payload} settings={settings} onNavigate={onNavigate} />

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
