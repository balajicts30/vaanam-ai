"use client";

import React, { useMemo, useState } from "react";
import {
  Calendar,
  CalendarDays,
  Clock,
  Cloud,
  CloudRain,
  Droplets,
  Gauge,
  Info,
  Sun,
  Thermometer,
  Wind,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  convertTemp,
  convertWind,
  formatDateShort,
  formatHourLabel,
  formatRain,
  formatTemp,
  formatWind,
  windDirectionToCompass,
} from "@/lib/units";
import { getWeatherCodeInfo } from "@/lib/weather-codes";
import { UserSettings, WeatherIntelligencePayload } from "@/types/weather";

export type ForecastTab = "30days" | "week" | "day" | "hour";

interface Props {
  payload: WeatherIntelligencePayload;
  settings: UserSettings;
  initialTab?: ForecastTab;
}

export function Forecast30DayView({ payload, settings, initialTab = "30days" }: Props) {
  const [tab, setTab] = useState<ForecastTab>(initialTab);
  const [selectedWeekIdx, setSelectedWeekIdx] = useState(0); // 0..3
  const [selectedDayIdx, setSelectedDayIdx] = useState(0); // 0..6 for Day view (hourly available)
  const [selectedHourIdx, setSelectedHourIdx] = useState(0); // 0..23

  const { daily30, hourly } = payload;

  // Weeks slice (4 weeks across 30 days)
  const weekSlice = useMemo(() => {
    const start = selectedWeekIdx * 7;
    return daily30.slice(start, start + 7);
  }, [daily30, selectedWeekIdx]);

  const weekHighlights = useMemo(() => {
    if (!weekSlice.length) return null;
    const wettest = weekSlice.reduce((a, b) =>
      (b.precipitationSum ?? 0) > (a.precipitationSum ?? 0) ? b : a
    );
    const hottest = weekSlice.reduce((a, b) =>
      (b.tempMax ?? -99) > (a.tempMax ?? -99) ? b : a
    );
    const cloudiest = weekSlice.reduce((a, b) =>
      (b.cloudCoverMean ?? -1) > (a.cloudCoverMean ?? -1) ? b : a
    );
    const windiest = weekSlice.reduce((a, b) =>
      (b.windSpeedMax ?? 0) > (a.windSpeedMax ?? 0) ? b : a
    );
    return { wettest, hottest, cloudiest, windiest };
  }, [weekSlice]);

  // 24-hour slice for selected day (Days 1..7 have real hourly ECMWF data)
  const dayHours = useMemo(() => {
    const start = selectedDayIdx * 24;
    return hourly.slice(start, start + 24);
  }, [hourly, selectedDayIdx]);

  const selectedHour = dayHours[selectedHourIdx] || hourly[0];

  const confBadge = (c: "HIGH" | "MODERATE" | "LOW") =>
    c === "HIGH"
      ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
      : c === "MODERATE"
      ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
      : "bg-slate-700/50 text-slate-300 border-slate-600/50";

  return (
    <div className="space-y-6">
      {/* Navigation Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">30-Day Forecast Explorer</h1>
          <p className="text-xs text-slate-400">
            Days 1–15: ECMWF IFS + 51-member ENS • Days 16–30: ECMWF SEAS5 Extended-Range Outlook (all times in{" "}
            <span className="text-cyan-300 font-mono">{payload.location.timezone}</span>)
          </p>
        </div>

        <div className="inline-flex rounded-2xl bg-slate-900/90 border border-cyan-500/20 p-1">
          {[
            { id: "30days", label: "30 Days", icon: Calendar },
            { id: "week", label: "Week", icon: CalendarDays },
            { id: "day", label: "Day", icon: Sun },
            { id: "hour", label: "Hour", icon: Clock },
          ].map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setTab(item.id as ForecastTab)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                  active
                    ? "bg-cyan-500/25 text-cyan-100 border border-cyan-400/40"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: 30-DAY OVERVIEW */}
      {tab === "30days" && (
        <div className="space-y-6">
          {/* Days 1-15 Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-cyan-300">
                Days 1–15 • Short &amp; Medium-Range Forecast (ECMWF IFS + ENS 51 Members)
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
              {daily30.slice(0, 15).map((d, idx) => {
                const info = getWeatherCodeInfo(d.weatherCode);
                const { weekday, dayMonth } = formatDateShort(d.date);
                return (
                  <button
                    key={d.date}
                    onClick={() => {
                      if (idx < 7) {
                        setSelectedDayIdx(idx);
                        setTab("day");
                      }
                    }}
                    className="glass-card rounded-2xl p-4 text-left hover:border-cyan-400/50 transition flex flex-col justify-between gap-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-bold text-white">
                          Day {d.dayIndex} • {weekday}
                        </div>
                        <div className="text-[11px] text-slate-400">{dayMonth}</div>
                      </div>
                      <span className="text-2xl">{info.emoji}</span>
                    </div>

                    <div className="text-xs font-medium text-cyan-200">{info.label}</div>

                    <div className="flex items-baseline justify-between">
                      <span className="text-lg font-extrabold text-white">
                        {formatTemp(d.tempMax, settings.tempUnit)}
                      </span>
                      <span className="text-xs text-slate-400">
                        Min {formatTemp(d.tempMin, settings.tempUnit)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 text-[11px] text-slate-300 pt-1 border-t border-slate-800/80">
                      <span className="flex items-center gap-1">
                        <CloudRain className="w-3 h-3 text-cyan-400" />
                        {d.rainProbability ?? 0}% ({formatRain(d.precipitationSum, settings.rainUnit)})
                      </span>
                      <span className="flex items-center gap-1">
                        <Wind className="w-3 h-3 text-sky-400" />
                        {formatWind(d.windSpeedMax, settings.windUnit)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Droplets className="w-3 h-3 text-blue-400" />
                        RH {d.humidityMean ?? "—"}%
                      </span>
                      <span className="flex items-center gap-1">
                        <Sun className="w-3 h-3 text-amber-400" />
                        UV {d.uvIndexMax !== null ? d.uvIndexMax.toFixed(1) : "—"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${confBadge(
                          d.confidence
                        )}`}
                      >
                        {d.confidence} CONF
                      </span>
                      {idx < 7 && (
                        <span className="text-[10px] text-cyan-400">Hourly →</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Days 16-30 Extended-Range Outlook Section */}
          <div className="space-y-3">
            <div className="rounded-2xl bg-indigo-950/35 border border-indigo-400/30 p-3.5 flex items-start gap-3">
              <Info className="w-4 h-4 text-indigo-300 shrink-0 mt-0.5" />
              <div className="text-xs text-indigo-100/90 leading-relaxed">
                <strong className="text-indigo-200">
                  Days 16–30 Extended-Range Outlook (ECMWF SEAS5 Seasonal Ensemble):
                </strong>{" "}
                Extended-range guidance reflects broad temperature anomalies, wet/dry tendencies,
                and wind trends — NOT deterministic hourly weather. Hourly breakdowns are
                intentionally omitted for Days 16–30.
              </div>
            </div>

            {daily30.slice(15, 30).length === 0 ? (
              <div className="glass-card rounded-2xl p-6 text-sm text-slate-400">
                Extended-range Days 16–30 data is currently unavailable from ECMWF SEAS5.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
                {daily30.slice(15, 30).map((d) => {
                  const info = getWeatherCodeInfo(d.weatherCode);
                  const { weekday, dayMonth } = formatDateShort(d.date);
                  const tempTendBadge =
                    d.tempTendency === "ABOVE_NORMAL"
                      ? "text-amber-300 bg-amber-500/15"
                      : d.tempTendency === "BELOW_NORMAL"
                      ? "text-sky-300 bg-sky-500/15"
                      : "text-slate-300 bg-slate-700/40";
                  const rainTendBadge =
                    d.rainTendency === "WETTER_THAN_NORMAL"
                      ? "text-cyan-300 bg-cyan-500/15"
                      : d.rainTendency === "DRIER_THAN_NORMAL"
                      ? "text-orange-200 bg-orange-500/15"
                      : "text-slate-300 bg-slate-700/40";

                  return (
                    <div
                      key={d.date}
                      className="glass-card-subtle rounded-2xl p-4 border-indigo-500/20 flex flex-col justify-between gap-2"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold text-indigo-200">
                            Day {d.dayIndex} • {weekday}
                          </div>
                          <div className="text-[11px] text-slate-400">{dayMonth}</div>
                        </div>
                        <span className="text-xl">{info.emoji}</span>
                      </div>

                      <div className="flex flex-wrap gap-1">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${tempTendBadge}`}>
                          {d.tempTendency?.replace(/_/g, " ") || "NEAR NORMAL"}
                        </span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${rainTendBadge}`}>
                          {d.rainTendency?.replace(/_/g, " ") || "NEAR NORMAL"}
                        </span>
                      </div>

                      <div className="flex items-baseline justify-between">
                        <span className="text-base font-bold text-white">
                          {formatTemp(d.tempMin, settings.tempUnit)} –{" "}
                          {formatTemp(d.tempMax, settings.tempUnit)}
                        </span>
                        {d.tempAnomaly != null && (
                          <span className="text-[11px] font-mono text-slate-400">
                            {d.tempAnomaly >= 0 ? "+" : ""}
                            {d.tempAnomaly.toFixed(1)}°C
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-slate-300">
                        Rain signal: {d.rainProbability ?? 0}% • Wind: {d.windTendency || "NORMAL"}
                      </div>

                      <div className="text-[10px] text-slate-400 leading-snug">
                        {d.outlookSummary}
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-800/70">
                        <span className="text-[10px] font-semibold text-indigo-300">
                          EXTENDED OUTLOOK
                        </span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${confBadge(d.confidence)}`}>
                          {d.confidence}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: WEEKLY VIEW */}
      {tab === "week" && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            {[0, 1, 2, 3].map((wIdx) => (
              <button
                key={wIdx}
                onClick={() => setSelectedWeekIdx(wIdx)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition ${
                  selectedWeekIdx === wIdx
                    ? "bg-cyan-500/20 border-cyan-400/50 text-cyan-100"
                    : "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                Week {wIdx + 1} (Days {wIdx * 7 + 1}–{Math.min(30, (wIdx + 1) * 7)})
                {wIdx >= 2 ? " • Extended" : ""}
              </button>
            ))}
          </div>

          {weekHighlights && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="glass-card rounded-2xl p-4">
                <div className="text-[11px] text-slate-400 uppercase font-semibold">Wettest Day</div>
                <div className="text-lg font-bold text-cyan-300 mt-1">
                  {formatDateShort(weekHighlights.wettest.date).weekday},{" "}
                  {formatDateShort(weekHighlights.wettest.date).dayMonth}
                </div>
                <div className="text-xs text-slate-300">
                  {formatRain(weekHighlights.wettest.precipitationSum, settings.rainUnit)} (
                  {weekHighlights.wettest.rainProbability ?? 0}% prob)
                </div>
              </div>
              <div className="glass-card rounded-2xl p-4">
                <div className="text-[11px] text-slate-400 uppercase font-semibold">Hottest Day</div>
                <div className="text-lg font-bold text-amber-300 mt-1">
                  {formatDateShort(weekHighlights.hottest.date).weekday},{" "}
                  {formatDateShort(weekHighlights.hottest.date).dayMonth}
                </div>
                <div className="text-xs text-slate-300">
                  High {formatTemp(weekHighlights.hottest.tempMax, settings.tempUnit)}
                </div>
              </div>
              <div className="glass-card rounded-2xl p-4">
                <div className="text-[11px] text-slate-400 uppercase font-semibold">Cloudiest Day</div>
                <div className="text-lg font-bold text-slate-200 mt-1">
                  {formatDateShort(weekHighlights.cloudiest.date).weekday},{" "}
                  {formatDateShort(weekHighlights.cloudiest.date).dayMonth}
                </div>
                <div className="text-xs text-slate-300">
                  Cloud Cover:{" "}
                  {weekHighlights.cloudiest.cloudCoverMean != null
                    ? `${weekHighlights.cloudiest.cloudCoverMean}%`
                    : "Extended Trend"}
                </div>
              </div>
              <div className="glass-card rounded-2xl p-4">
                <div className="text-[11px] text-slate-400 uppercase font-semibold">Windiest Day</div>
                <div className="text-lg font-bold text-sky-300 mt-1">
                  {formatDateShort(weekHighlights.windiest.date).weekday},{" "}
                  {formatDateShort(weekHighlights.windiest.date).dayMonth}
                </div>
                <div className="text-xs text-slate-300">
                  Peak {formatWind(weekHighlights.windiest.windSpeedMax, settings.windUnit)}
                </div>
              </div>
            </div>
          )}

          <div className="glass-card rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">
              7-Day Temperature &amp; Rainfall Trend
            </h3>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={weekSlice.map((d) => ({
                    name: `${formatDateShort(d.date).weekday} ${formatDateShort(d.date).dayMonth}`,
                    maxTemp: convertTemp(d.tempMax, settings.tempUnit),
                    minTemp: convertTemp(d.tempMin, settings.tempUnit),
                    rain: d.precipitationSum ?? 0,
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
                  <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                  <YAxis yAxisId="t" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                  <YAxis yAxisId="r" orientation="right" tick={{ fill: "#22d3ee", fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#071124",
                      borderColor: "rgba(56,189,248,0.3)",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                  />
                  <Bar yAxisId="r" dataKey="rain" name="Rainfall (mm)" fill="#06b6d4" radius={[6, 6, 0, 0]} barSize={28} />
                  <Line yAxisId="t" type="monotone" dataKey="maxTemp" name={`Max (°${settings.tempUnit})`} stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 4 }} />
                  <Line yAxisId="t" type="monotone" dataKey="minTemp" name={`Min (°${settings.tempUnit})`} stroke="#38bdf8" strokeWidth={2.5} dot={{ r: 4 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: DAILY 24-HOUR VIEW */}
      {tab === "day" && (
        <div className="space-y-5">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {daily30.slice(0, 7).map((d, idx) => {
              const { weekday, dayMonth } = formatDateShort(d.date);
              return (
                <button
                  key={d.date}
                  onClick={() => {
                    setSelectedDayIdx(idx);
                    setSelectedHourIdx(0);
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap border transition ${
                    selectedDayIdx === idx
                      ? "bg-cyan-500/20 border-cyan-400/50 text-cyan-100"
                      : "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {weekday}, {dayMonth}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <div className="glass-card rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-white mb-3">
                24-Hour Temperature &amp; Feels-Like Curve
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={dayHours.map((h) => ({
                      label: formatHourLabel(h.time, settings.clockFormat),
                      temp: convertTemp(h.temperature, settings.tempUnit),
                      feels: convertTemp(h.feelsLike, settings.tempUnit),
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
                    <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 10 }} interval={2} />
                    <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
                    <Tooltip contentStyle={{ backgroundColor: "#071124", borderRadius: 12, fontSize: 12 }} />
                    <Line type="monotone" dataKey="temp" name={`Temp (°${settings.tempUnit})`} stroke="#38bdf8" strokeWidth={2.5} dot={false} />
                    <Line type="monotone" dataKey="feels" name={`Feels Like (°${settings.tempUnit})`} stroke="#f59e0b" strokeDasharray="4 4" strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="glass-card rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-white mb-3">
                24-Hour Rain Probability &amp; Wind Speed
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={dayHours.map((h) => ({
                      label: formatHourLabel(h.time, settings.clockFormat),
                      rainProb: h.rainProbability ?? 0,
                      wind: convertWind(h.windSpeed, settings.windUnit),
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
                    <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 10 }} interval={2} />
                    <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
                    <Tooltip contentStyle={{ backgroundColor: "#071124", borderRadius: 12, fontSize: 12 }} />
                    <Bar dataKey="rainProb" name="Rain Prob (%)" fill="#22d3ee" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="wind" name={`Wind (${settings.windUnit})`} fill="#818cf8" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-900/90 text-slate-400 uppercase text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Time</th>
                    <th className="px-4 py-3">Condition</th>
                    <th className="px-4 py-3">Temp / Feels</th>
                    <th className="px-4 py-3">Rain Prob</th>
                    <th className="px-4 py-3">Rainfall</th>
                    <th className="px-4 py-3">Wind</th>
                    <th className="px-4 py-3">Humidity</th>
                    <th className="px-4 py-3">Clouds</th>
                    <th className="px-4 py-3">Pressure</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {dayHours.map((h) => {
                    const info = getWeatherCodeInfo(h.weatherCode);
                    return (
                      <tr key={h.time} className="hover:bg-cyan-500/5">
                        <td className="px-4 py-2.5 font-mono text-slate-200">
                          {formatHourLabel(h.time, settings.clockFormat)}
                        </td>
                        <td className="px-4 py-2.5 text-slate-200">
                          {info.emoji} {info.shortLabel}
                        </td>
                        <td className="px-4 py-2.5 font-semibold text-white">
                          {formatTemp(h.temperature, settings.tempUnit)}{" "}
                          <span className="text-slate-400 font-normal">
                            / {formatTemp(h.feelsLike, settings.tempUnit)}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-cyan-300 font-semibold">
                          {h.rainProbability ?? 0}%
                        </td>
                        <td className="px-4 py-2.5 text-slate-300">
                          {formatRain(h.precipitation, settings.rainUnit)}
                        </td>
                        <td className="px-4 py-2.5 text-slate-300">
                          {formatWind(h.windSpeed, settings.windUnit)}{" "}
                          {windDirectionToCompass(h.windDirection)}
                        </td>
                        <td className="px-4 py-2.5 text-slate-300">{h.humidity ?? "—"}%</td>
                        <td className="px-4 py-2.5 text-slate-300">{h.cloudCover ?? "—"}%</td>
                        <td className="px-4 py-2.5 text-slate-400 font-mono">
                          {h.pressure ? `${Math.round(h.pressure)} hPa` : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: INTERACTIVE HOURLY INSPECTOR */}
      {tab === "hour" && selectedHour && (
        <div className="space-y-5">
          <div className="glass-card rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white">
                Select Forecast Hour (24-Hour Interactive Timeline)
              </h3>
              <span className="text-xs font-mono text-cyan-300">
                {selectedHour.time.replace("T", " ")} ({payload.location.timezone})
              </span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {dayHours.map((h, i) => {
                const info = getWeatherCodeInfo(h.weatherCode);
                const active = i === selectedHourIdx;
                return (
                  <button
                    key={h.time}
                    onClick={() => setSelectedHourIdx(i)}
                    className={`min-w-[78px] rounded-2xl p-3 flex flex-col items-center gap-1 border transition ${
                      active
                        ? "bg-cyan-500/25 border-cyan-400 text-white"
                        : "bg-slate-900/70 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <span className="text-[11px] font-mono">
                      {formatHourLabel(h.time, settings.clockFormat)}
                    </span>
                    <span className="text-lg">{info.emoji}</span>
                    <span className="text-xs font-bold text-white">
                      {formatTemp(h.temperature, settings.tempUnit)}
                    </span>
                    <span className="text-[10px] text-cyan-300">{h.rainProbability ?? 0}%</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="glass-card rounded-2xl p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <span
                className={`inline-block text-[10px] font-bold px-2.5 py-1 rounded-full border ${confBadge(
                  selectedHour.confidence
                )}`}
              >
                {selectedHour.confidence} FORECAST CONFIDENCE
              </span>
              <div className="text-4xl font-extrabold text-white">
                {formatTemp(selectedHour.temperature, settings.tempUnit)}
              </div>
              <div className="text-base font-semibold text-cyan-200">
                {getWeatherCodeInfo(selectedHour.weatherCode).emoji}{" "}
                {getWeatherCodeInfo(selectedHour.weatherCode).label}
              </div>
              <p className="text-xs text-slate-400">
                Feels like {formatTemp(selectedHour.feelsLike, settings.tempUnit)} • Ensemble spread:{" "}
                {selectedHour.tempSpread != null ? `±${selectedHour.tempSpread.toFixed(1)}°C` : "—"}
              </p>
            </div>

            <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="rounded-xl bg-slate-950/60 border border-slate-800 p-3">
                <div className="text-[11px] text-slate-400 flex items-center gap-1">
                  <CloudRain className="w-3.5 h-3.5 text-cyan-400" /> Rainfall
                </div>
                <div className="text-lg font-bold text-white mt-1">
                  {formatRain(selectedHour.precipitation, settings.rainUnit)}
                </div>
                <div className="text-[11px] text-cyan-300">
                  Prob: {selectedHour.rainProbability ?? 0}%
                </div>
              </div>
              <div className="rounded-xl bg-slate-950/60 border border-slate-800 p-3">
                <div className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Wind className="w-3.5 h-3.5 text-sky-400" /> Wind
                </div>
                <div className="text-lg font-bold text-white mt-1">
                  {formatWind(selectedHour.windSpeed, settings.windUnit)}
                </div>
                <div className="text-[11px] text-slate-400">
                  Direction: {windDirectionToCompass(selectedHour.windDirection)}
                </div>
              </div>
              <div className="rounded-xl bg-slate-950/60 border border-slate-800 p-3">
                <div className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Cloud className="w-3.5 h-3.5 text-slate-300" /> Cloud Cover
                </div>
                <div className="text-lg font-bold text-white mt-1">
                  {selectedHour.cloudCover ?? "—"}%
                </div>
                <div className="text-[11px] text-slate-400">
                  Solar: {selectedHour.solarRadiation ?? "—"} W/m²
                </div>
              </div>
              <div className="rounded-xl bg-slate-950/60 border border-slate-800 p-3">
                <div className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Droplets className="w-3.5 h-3.5 text-blue-400" /> Humidity
                </div>
                <div className="text-lg font-bold text-white mt-1">
                  {selectedHour.humidity ?? "—"}%
                </div>
                <div className="text-[11px] text-slate-400">
                  Dew: {formatTemp(selectedHour.dewPoint, settings.tempUnit)}
                </div>
              </div>
              <div className="rounded-xl bg-slate-950/60 border border-slate-800 p-3">
                <div className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Gauge className="w-3.5 h-3.5 text-indigo-400" /> Pressure
                </div>
                <div className="text-lg font-bold text-white mt-1">
                  {selectedHour.pressure ? `${Math.round(selectedHour.pressure)} hPa` : "—"}
                </div>
              </div>
              <div className="rounded-xl bg-slate-950/60 border border-slate-800 p-3">
                <div className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Thermometer className="w-3.5 h-3.5 text-amber-400" /> ENS Range
                </div>
                <div className="text-lg font-bold text-white mt-1">
                  {formatTemp(selectedHour.tempMin, settings.tempUnit)} –{" "}
                  {formatTemp(selectedHour.tempMax, settings.tempUnit)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
