"use client";

import React, { useMemo, useState } from "react";
import { ExternalLink, GitCompare, Info, ShieldAlert } from "lucide-react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { convertTemp, convertWind, formatHourLabel } from "@/lib/units";
import { UserSettings, WeatherIntelligencePayload } from "@/types/weather";

type MetricKey =
  | "temperature"
  | "precipitation"
  | "windSpeed"
  | "rainProbability"
  | "cloudCover"
  | "pressure";

interface Props {
  payload: WeatherIntelligencePayload;
  settings: UserSettings;
}

export function ModelComparisonView({ payload, settings }: Props) {
  const [metric, setMetric] = useState<MetricKey>("temperature");
  const { comparison, models } = payload;

  const chartData = useMemo(() => {
    const base = comparison.series.ecmwf_ifs.slice(0, 72);
    const ensMap = new Map(comparison.series.ecmwf_ens.map((p) => [p.time, p]));
    const wnMap = new Map(comparison.series.weathernext3.map((p) => [p.time, p]));
    const hrefMap = new Map(comparison.series.noaa_href.map((p) => [p.time, p]));

    const transformVal = (v: number | null | undefined): number | null => {
      if (v === null || v === undefined) return null;
      if (metric === "temperature") return convertTemp(v, settings.tempUnit);
      if (metric === "windSpeed") return convertWind(v, settings.windUnit);
      return v;
    };

    return base.map((p) => {
      const ens = ensMap.get(p.time);
      const wn = wnMap.get(p.time);
      const href = hrefMap.get(p.time);
      const dayTag = p.time.slice(5, 10);
      return {
        label: `${dayTag} ${formatHourLabel(p.time, settings.clockFormat)}`,
        ecmwf_ifs: transformVal(p[metric]),
        ecmwf_ens: transformVal(ens?.[metric]),
        weathernext3: transformVal(wn?.[metric]),
        noaa_href: transformVal(href?.[metric]),
      };
    });
  }, [comparison, metric, settings.tempUnit, settings.windUnit, settings.clockFormat]);

  const agreementBadge =
    comparison.agreementLevel === "HIGH"
      ? "bg-emerald-500/20 text-emerald-200 border-emerald-400/40"
      : comparison.agreementLevel === "MODERATE"
      ? "bg-amber-500/20 text-amber-200 border-amber-400/40"
      : "bg-rose-500/20 text-rose-200 border-rose-400/40";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <GitCompare className="w-6 h-6 text-cyan-400" />
            Multi-Model Weather Comparison
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Compare WeatherNext 3, ECMWF ENS (51-member mean), ECMWF IFS, NOAA HREF (US only), and ECMWF SEAS5
          </p>
        </div>

        <div className={`px-4 py-2 rounded-2xl border text-xs font-bold ${agreementBadge}`}>
          {comparison.agreementLevel} AGREEMENT
          {comparison.agreementScore !== null ? ` (${comparison.agreementScore}/100)` : ""}
        </div>
      </div>

      {/* Model Agreement Banner */}
      <div className="glass-card rounded-2xl p-5 space-y-2">
        <div className="text-sm font-semibold text-white">{comparison.agreementSummary}</div>
        <div className="flex items-start gap-2 text-xs text-amber-200/90 bg-amber-950/25 border border-amber-500/25 rounded-xl p-3">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <span>{comparison.note}</span>
        </div>
      </div>

      {/* Variable Switcher & Comparison Chart */}
      <div className="glass-card rounded-2xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-white">72-Hour Inter-Model Comparison Chart</h2>
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: "temperature", label: `Temperature (°${settings.tempUnit})` },
              { id: "precipitation", label: "Rainfall (mm)" },
              { id: "windSpeed", label: `Wind (${settings.windUnit})` },
              { id: "rainProbability", label: "Rain Prob (%)" },
              { id: "cloudCover", label: "Cloud Cover (%)" },
              { id: "pressure", label: "Pressure (hPa)" },
            ].map((btn) => (
              <button
                key={btn.id}
                onClick={() => setMetric(btn.id as MetricKey)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition ${
                  metric === btn.id
                    ? "bg-cyan-500/20 border-cyan-400/50 text-cyan-100"
                    : "bg-slate-900/70 border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 16, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
              <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 10 }} interval={5} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#071124",
                  borderColor: "rgba(56,189,248,0.3)",
                  borderRadius: 12,
                  fontSize: 12,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="ecmwf_ifs" name="ECMWF IFS 0.25°" stroke="#38bdf8" strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="ecmwf_ens" name="ECMWF ENS (51-Member Mean)" stroke="#22d3ee" strokeWidth={2.2} strokeDasharray="5 3" dot={false} />
              {comparison.series.weathernext3.length > 0 && (
                <Line type="monotone" dataKey="weathernext3" name="Google WeatherNext 3" stroke="#a855f7" strokeWidth={2.5} dot={false} />
              )}
              {comparison.series.noaa_href.length > 0 && (
                <Line type="monotone" dataKey="noaa_href" name="NOAA HREF / HRRR (3 km US)" stroke="#f59e0b" strokeWidth={2.2} dot={false} />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Model Metadata & Availability Table */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800/80 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Model Metadata, Resolution &amp; Availability</h2>
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <Info className="w-3.5 h-3.5 text-cyan-400" /> Zero fabricated fallbacks
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-900/90 text-slate-400 uppercase text-[10px]">
              <tr>
                <th className="px-4 py-3">Model</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Spatial Res</th>
                <th className="px-4 py-3">Horizon</th>
                <th className="px-4 py-3">Members</th>
                <th className="px-4 py-3">Init / Retrieved</th>
                <th className="px-4 py-3">Details &amp; Docs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {models.map((m) => (
                <tr key={m.id} className="hover:bg-slate-900/40">
                  <td className="px-4 py-3 font-semibold text-white">
                    <div>{m.name}</div>
                    <div className="text-[10px] text-slate-400 font-normal">{m.provider}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        m.status === "LIVE"
                          ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                          : m.status === "CREDENTIALS_REQUIRED"
                          ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                          : "bg-slate-700/50 text-slate-300 border-slate-600/50"
                      }`}
                    >
                      {m.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-300">{m.spatialResolution}</td>
                  <td className="px-4 py-3 text-slate-300">{m.forecastHorizon}</td>
                  <td className="px-4 py-3 font-mono text-slate-300">{m.ensembleMembers ?? "—"}</td>
                  <td className="px-4 py-3 font-mono text-[11px] text-slate-400">
                    <div>Init: {m.initializationTime ? m.initializationTime.slice(0, 16) : "—"}</div>
                    <div>Sync: {new Date(m.retrievedAt).toLocaleTimeString()}</div>
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    <p className="text-[11px] text-slate-300 leading-snug">{m.statusMessage}</p>
                    <a
                      href={m.documentationUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-cyan-400 hover:underline mt-1"
                    >
                      Official Docs <ExternalLink className="w-3 h-3" />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
