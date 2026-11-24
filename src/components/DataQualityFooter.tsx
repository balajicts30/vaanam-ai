"use client";

import React from "react";
import { AlertTriangle, CheckCircle2, Info, ShieldAlert } from "lucide-react";
import { WeatherIntelligencePayload } from "@/types/weather";

interface Props {
  payload: WeatherIntelligencePayload | null;
}

export function DataQualityFooter({ payload }: Props) {
  return (
    <footer className="mt-8 space-y-4">
      {payload && (
        <div className="glass-card-subtle rounded-2xl p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
                Data Quality &amp; Model Provenance ({payload.dataQuality.liveSourcesCount}/
                {payload.dataQuality.totalSourcesCount} Live)
              </h3>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              Updated: {new Date(payload.retrievedAt).toLocaleString()} • Coords:{" "}
              {payload.location.latitude.toFixed(4)}, {payload.location.longitude.toFixed(4)}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-2.5">
            {payload.models.map((m) => {
              const badgeColor =
                m.status === "LIVE"
                  ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                  : m.status === "UNAVAILABLE_OUTSIDE_COVERAGE"
                  ? "bg-slate-700/40 text-slate-300 border-slate-600/40"
                  : m.status === "CREDENTIALS_REQUIRED"
                  ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                  : "bg-rose-500/15 text-rose-300 border-rose-500/30";

              return (
                <div
                  key={m.id}
                  className="rounded-xl bg-slate-950/60 border border-slate-800/80 p-3 flex flex-col justify-between gap-1.5"
                >
                  <div className="flex items-start justify-between gap-1.5">
                    <span className="text-xs font-semibold text-slate-200 leading-tight">
                      {m.name}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded border whitespace-nowrap ${badgeColor}`}
                    >
                      {m.status === "UNAVAILABLE_OUTSIDE_COVERAGE"
                        ? "OUTSIDE DOMAIN"
                        : m.status === "CREDENTIALS_REQUIRED"
                        ? "KEY NEEDED"
                        : m.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug line-clamp-2">
                    {m.statusMessage}
                  </p>
                  <div className="text-[10px] font-mono text-slate-500">
                    {m.spatialResolution} • {m.forecastHorizon}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Mandatory Meteorological Disclaimer */}
      <div className="rounded-2xl bg-amber-950/20 border border-amber-500/25 p-4 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-300 leading-relaxed space-y-1">
          <p className="font-semibold text-amber-200 flex items-center gap-1.5">
            <span>Meteorological Forecast &amp; Safety Disclaimer</span>
          </p>
          <p>
            Weather forecasts are model-based predictions and may change. Extended-range outlooks
            (Days 16–30) are less certain than short-range forecasts. This platform is intended for
            informational purposes and does not replace official meteorological warnings. Follow{" "}
            <a
              href="https://mausam.imd.gov.in/"
              target="_blank"
              rel="noreferrer"
              className="text-cyan-300 underline hover:text-cyan-200"
            >
              IMD (India Meteorological Department)
            </a>{" "}
            and local authorities for safety-critical decisions.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 px-1 pb-4">
        <span className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5" />
          VAANAM AI — Real Data. Clear Forecasts. Beautiful Stories.
        </span>
        <span className="flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 text-cyan-500/70" />
          Ensemble agreement reflects model consensus, not guaranteed accuracy.
        </span>
      </div>
    </footer>
  );
}
