"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Clock,
  Cloud,
  CloudLightning,
  CloudRain,
  Download,
  Droplets,
  Gauge,
  Radio,
  Share2,
  ShieldCheck,
  Sun,
  Thermometer,
  Wind,
  X,
} from "lucide-react";
import { apiFetchRadar } from "@/lib/client-api";
import { buildWeatherPulse, formatTimeInTimezone } from "@/lib/models/weather-pulse";
import { resolveWeatherPhoto } from "@/lib/photography";
import { renderWeatherPulsePng } from "@/lib/studio/weather-pulse-png";
import {
  formatRain,
  formatTemp,
  formatWind,
  windDirectionToCompass,
} from "@/lib/units";
import { getWeatherCodeInfo } from "@/lib/weather-codes";
import {
  NavSection,
  RainViewerPayload,
  TimelineEvent,
  TimelineEventKind,
  TimelineSourceType,
  UserSettings,
  WeatherIntelligencePayload,
} from "@/types/weather";

interface Props {
  payload: WeatherIntelligencePayload;
  settings: UserSettings;
  onNavigate: (section: NavSection) => void;
}

function getEventVisuals(kind: TimelineEventKind): {
  icon: React.ComponentType<{ className?: string }>;
  dotClass: string;
  borderClass: string;
  bgClass: string;
  accentText: string;
  badgeBg: string;
} {
  switch (kind) {
    case "thunderstorm":
      return {
        icon: CloudLightning,
        dotClass: "border-violet-400 bg-violet-400 shadow-[0_0_12px_rgba(167,139,250,0.8)]",
        borderClass: "border-violet-500/40 hover:border-violet-400/65",
        bgClass: "bg-violet-950/30",
        accentText: "text-violet-300",
        badgeBg: "bg-violet-500/20 text-violet-200 border-violet-400/35",
      };
    case "heavy_rain":
      return {
        icon: CloudRain,
        dotClass: "border-blue-400 bg-blue-400 shadow-[0_0_12px_rgba(96,165,250,0.8)]",
        borderClass: "border-blue-500/40 hover:border-blue-400/65",
        bgClass: "bg-blue-950/35",
        accentText: "text-blue-300",
        badgeBg: "bg-blue-500/20 text-blue-200 border-blue-400/35",
      };
    case "rain":
      return {
        icon: Droplets,
        dotClass: "border-cyan-400 bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.8)]",
        borderClass: "border-cyan-500/35 hover:border-cyan-400/60",
        bgClass: "bg-cyan-950/25",
        accentText: "text-cyan-300",
        badgeBg: "bg-cyan-500/20 text-cyan-200 border-cyan-400/35",
      };
    case "wind":
      return {
        icon: Wind,
        dotClass: "border-sky-400 bg-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.75)]",
        borderClass: "border-sky-500/35 hover:border-sky-400/60",
        bgClass: "bg-sky-950/25",
        accentText: "text-sky-300",
        badgeBg: "bg-sky-500/20 text-sky-200 border-sky-400/35",
      };
    case "clouds":
      return {
        icon: Cloud,
        dotClass: "border-slate-400 bg-slate-300 shadow-[0_0_10px_rgba(148,163,184,0.6)]",
        borderClass: "border-slate-600/45 hover:border-slate-400/60",
        bgClass: "bg-slate-900/55",
        accentText: "text-slate-300",
        badgeBg: "bg-slate-700/40 text-slate-200 border-slate-500/40",
      };
    case "temperature":
      return {
        icon: Thermometer,
        dotClass: "border-amber-400 bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.75)]",
        borderClass: "border-amber-500/35 hover:border-amber-400/60",
        bgClass: "bg-amber-950/20",
        accentText: "text-amber-300",
        badgeBg: "bg-amber-500/20 text-amber-200 border-amber-400/35",
      };
    case "clearing":
      return {
        icon: Sun,
        dotClass: "border-emerald-400 bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.75)]",
        borderClass: "border-emerald-500/35 hover:border-emerald-400/60",
        bgClass: "bg-emerald-950/20",
        accentText: "text-emerald-300",
        badgeBg: "bg-emerald-500/20 text-emerald-200 border-emerald-400/35",
      };
  }
}

function getSourceBadgeMeta(sourceType: TimelineSourceType): {
  label: string;
  className: string;
} {
  switch (sourceType) {
    case "radar_observation":
      return {
        label: "Radar Observation",
        className: "bg-emerald-500/20 text-emerald-200 border-emerald-400/40",
      };
    case "radar_estimate":
      return {
        label: "Radar-Based Estimate",
        className: "bg-cyan-500/20 text-cyan-200 border-cyan-400/40",
      };
    case "model_forecast":
      return {
        label: "Model Forecast",
        className: "bg-blue-500/20 text-blue-200 border-blue-400/35",
      };
  }
}

function getConfidenceClass(conf: "HIGH" | "MODERATE" | "LOW"): string {
  if (conf === "HIGH") return "text-emerald-300 border-emerald-500/35 bg-emerald-500/15";
  if (conf === "MODERATE") return "text-sky-300 border-sky-500/35 bg-sky-500/15";
  return "text-amber-300 border-amber-500/35 bg-amber-500/15";
}

export function WeatherPulseCard({ payload, settings, onNavigate }: Props) {
  const { location, current, daily30, comparison } = payload;
  const [horizonHours, setHorizonHours] = useState<3 | 6>(6);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [radar, setRadar] = useState<RainViewerPayload | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);

  const shareCanvasRef = useRef<HTMLCanvasElement>(null);

  // Fetch live RainViewer radar metadata (non-blocking; gracefully falls back to model-only if unavailable)
  useEffect(() => {
    let active = true;
    apiFetchRadar()
      .then((data) => {
        if (active) setRadar(data);
      })
      .catch(() => {
        if (active) setRadar(null);
      });
    return () => {
      active = false;
    };
  }, [location.latitude, location.longitude]);

  const pulse = useMemo(
    () => buildWeatherPulse(payload, radar, settings, horizonHours),
    [payload, radar, settings, horizonHours]
  );

  const scopeKey = `${location.latitude.toFixed(3)}:${location.longitude.toFixed(3)}:${horizonHours}`;

  const curInfo = getWeatherCodeInfo(current.weatherCode);
  const photo = resolveWeatherPhoto(current.weatherCode, current.temperature, location.name);
  const today = daily30[0];

  // Render the 1080×1350 PNG whenever share modal is open
  useEffect(() => {
    if (!shareModalOpen) return;
    const canvas = shareCanvasRef.current;
    if (!canvas) return;
    renderWeatherPulsePng(canvas, payload, pulse, settings, horizonHours);
  }, [shareModalOpen, payload, pulse, settings, horizonHours]);

  const handleDownloadPng = () => {
    const canvas = shareCanvasRef.current;
    if (!canvas) return;
    const slug = location.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const link = document.createElement("a");
    link.download = `vaanam-weather-pulse-${slug}-9x16-1080x1920.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const handleNativeSharePng = async () => {
    const canvas = shareCanvasRef.current;
    if (!canvas) return;
    const slug = location.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const filename = `vaanam-weather-pulse-${slug}-9x16-1080x1920.png`;

    try {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), "image/png")
      );
      if (blob && typeof navigator !== "undefined" && navigator.share && navigator.canShare) {
        const file = new File([blob], filename, { type: "image/png" });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: `VAANAM AI Weather Pulse — ${location.name}`,
            text: `${pulse.headline} (${location.name})`,
            files: [file],
          });
          return;
        }
      }
    } catch {
      // User cancelled or unsupported; fall back to direct PNG download
    }
    handleDownloadPng();
  };

  const toggleEvent = (ev: TimelineEvent) => {
    const key = `${scopeKey}:${ev.id}`;
    setExpandedEventId((prev) => (prev === key ? null : key));
  };

  return (
    <>
      <section className="relative overflow-hidden rounded-3xl border border-cyan-500/30 shadow-2xl bg-[#040a18]">
        {/* Atmospheric Background Photography + Dark Navy Gradient */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-25 scale-105 pointer-events-none"
          style={{ backgroundImage: `url(${photo.url})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#040914]/96 via-[#07152e]/90 to-[#040914]/95 pointer-events-none" />

        <div className="relative z-10 p-5 sm:p-6 lg:p-8 space-y-6">
          {/* ================================================================
              A. HEADER
             ================================================================ */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-cyan-500/15">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-extrabold tracking-[0.18em] uppercase text-cyan-300">
                  VAANAM AI WEATHER PULSE
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                    pulse.statusMode === "LIVE_RADAR"
                      ? "bg-emerald-500/20 border-emerald-400/40 text-emerald-200"
                      : pulse.statusMode === "NOWCAST"
                      ? "bg-cyan-500/20 border-cyan-400/40 text-cyan-200"
                      : "bg-blue-500/20 border-blue-400/35 text-blue-200"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                      pulse.statusMode === "LIVE_RADAR" ? "bg-emerald-400" : "bg-cyan-400"
                    }`}
                  />
                  {pulse.statusLabel}
                </span>
              </div>

              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                  {location.name}
                </h1>
                <span className="text-xs sm:text-sm text-slate-300">
                  {[location.district, location.state, location.country].filter(Boolean).join(", ")}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
                <span className="inline-flex items-center gap-1">
                  <Clock className="w-3 h-3 text-cyan-400" />
                  Updated {pulse.lastUpdatedLocal} ({location.timezone}) • {pulse.dataFreshnessLabel}
                </span>
                {pulse.radarObservationTimeLabel && (
                  <span className="text-emerald-300/90">
                    • Radar frame: {pulse.radarObservationTimeLabel}
                  </span>
                )}
              </div>
            </div>

            {/* Share as PNG Button */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setShareModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500/20 to-sky-500/20 hover:from-cyan-500/30 hover:to-sky-500/30 border border-cyan-400/40 text-cyan-100 text-xs font-bold transition shadow-lg shadow-cyan-950/40"
              >
                <Share2 className="w-3.5 h-3.5 text-cyan-300" />
                Share as PNG
              </button>
            </div>
          </div>

          {/* ================================================================
              B. MAIN WEATHER ALERT
             ================================================================ */}
          <div className="rounded-2xl bg-gradient-to-r from-slate-950/75 via-[#091b38]/75 to-slate-950/65 border border-cyan-500/25 p-5 sm:p-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
              {/* Large Weather Visual + Temperature */}
              <div className="flex items-center gap-4 sm:gap-5 shrink-0">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-cyan-500/10 border border-cyan-400/25 flex items-center justify-center text-5xl sm:text-6xl shadow-inner">
                  <span role="img" aria-label={curInfo.label}>
                    {curInfo.emoji}
                  </span>
                </div>
                <div>
                  <div className="text-4xl sm:text-5xl font-extrabold tracking-tighter text-white leading-none">
                    {formatTemp(current.temperature, settings.tempUnit)}
                  </div>
                  <div className="text-sm font-semibold text-cyan-200 mt-1">
                    {curInfo.label}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Feels {formatTemp(current.feelsLike, settings.tempUnit)} • Today{" "}
                    {formatTemp(today?.tempMin, settings.tempUnit)} /{" "}
                    {formatTemp(today?.tempMax, settings.tempUnit)}
                  </div>
                </div>
              </div>

              {/* Dynamic Alert Headline, Arrival Estimate, Explanation & Action */}
              <div className="flex-1 space-y-2.5 lg:border-l lg:border-cyan-500/15 lg:pl-6">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                    {pulse.headline}
                  </h2>
                  {pulse.arrivalEstimate && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-cyan-200 text-xs font-semibold">
                      <Clock className="w-3.5 h-3.5" />
                      {pulse.arrivalEstimate}
                    </span>
                  )}
                </div>

                <p className="text-sm text-slate-200 leading-relaxed">
                  {pulse.explanation}
                </p>

                <div className="inline-flex items-start gap-2 rounded-xl bg-cyan-500/10 border border-cyan-400/20 px-3.5 py-2 text-xs text-cyan-100">
                  <ShieldCheck className="w-4 h-4 text-cyan-300 shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-cyan-200">Action:</strong> {pulse.actionRecommendation}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ================================================================
              C. WEATHER METRICS
             ================================================================ */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="rounded-2xl bg-slate-950/65 border border-slate-800/90 p-3.5">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 uppercase font-semibold">
                <CloudRain className="w-3.5 h-3.5 text-cyan-400" /> Rain Prob
              </div>
              <div className="text-xl font-bold text-white mt-1">
                {pulse.maxRainProbNext6h !== null
                  ? `${pulse.maxRainProbNext6h}%`
                  : current.rainProbability !== null
                  ? `${current.rainProbability}%`
                  : "—"}
              </div>
              <div className="text-[11px] text-slate-400">Next 6h peak</div>
            </div>

            <div className="rounded-2xl bg-slate-950/65 border border-slate-800/90 p-3.5">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 uppercase font-semibold">
                <Droplets className="w-3.5 h-3.5 text-blue-400" /> Expected Rain
              </div>
              <div className="text-xl font-bold text-white mt-1">
                {formatRain(pulse.expectedRainNext6hMm, settings.rainUnit)}
              </div>
              <div className="text-[11px] text-slate-400">
                {formatRain(today?.precipitationSum, settings.rainUnit)} today
              </div>
            </div>

            <div className="rounded-2xl bg-slate-950/65 border border-slate-800/90 p-3.5">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 uppercase font-semibold">
                <Thermometer className="w-3.5 h-3.5 text-amber-400" /> Temperature
              </div>
              <div className="text-xl font-bold text-white mt-1">
                {formatTemp(current.temperature, settings.tempUnit)}
              </div>
              <div className="text-[11px] text-slate-400">
                Humidity {current.humidity ?? "—"}%
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
                Dir: {windDirectionToCompass(current.windDirection)} • {current.pressure ? `${Math.round(current.pressure)} hPa` : "—"}
              </div>
            </div>

            <div className="col-span-2 sm:col-span-1 rounded-2xl bg-slate-950/65 border border-slate-800/90 p-3.5">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 uppercase font-semibold">
                <Gauge className="w-3.5 h-3.5 text-emerald-400" /> Confidence
              </div>
              <div className="mt-1 flex items-center gap-2">
                <span
                  className={`text-sm font-extrabold px-2.5 py-0.5 rounded-full border ${getConfidenceClass(
                    pulse.confidence
                  )}`}
                >
                  {pulse.confidence}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Agreement: {comparison.agreementLevel}
              </div>
            </div>
          </div>

          {/* ================================================================
              D. UPCOMING WEATHER TIMELINE (Integrated inside Weather Pulse Card)
             ================================================================ */}
          <div className="pt-5 border-t border-cyan-500/20 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-[0.16em] text-cyan-300">
                  UPCOMING WEATHER TIMELINE
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  What could happen over the next few hours?
                </p>
              </div>

              {/* Horizon Switcher (3H / 6H) + Live Radar Shortcut */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex rounded-xl bg-slate-950/85 border border-cyan-500/25 p-0.5">
                  {([3, 6] as const).map((hrs) => (
                    <button
                      key={hrs}
                      onClick={() => setHorizonHours(hrs)}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition ${
                        horizonHours === hrs
                          ? "bg-cyan-500/25 text-cyan-100 border border-cyan-400/40"
                          : "text-slate-400 hover:text-slate-200 border border-transparent"
                      }`}
                    >
                      Next {hrs} Hours
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => onNavigate("radar")}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/35 text-emerald-200 text-[11px] font-semibold transition"
                >
                  <Radio className="w-3.5 h-3.5" />
                  Live Radar
                </button>
              </div>
            </div>

            {/* Empty State when no meaningful events detected */}
            {pulse.events.length === 0 ? (
              <div className="rounded-2xl bg-slate-950/60 border border-slate-800/90 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-300">
                    <Sun className="w-5 h-5" />
                  </span>
                  <div>
                    <div className="text-sm font-semibold text-slate-100">
                      No significant weather changes expected in the next few hours.
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      ECMWF IFS 0.25° &amp; ENS 51-member short-range guidance shows steady conditions for {location.name}.
                    </div>
                  </div>
                </div>
                <span className="text-[11px] text-slate-400 shrink-0">
                  {pulse.dataFreshnessLabel}
                </span>
              </div>
            ) : (
              /* Chronological Vertical Timeline with Connecting Rail */
              <div className="relative pl-6 sm:pl-7 space-y-3">
                {/* Connecting vertical line */}
                <div
                  className="absolute left-[11px] sm:left-[13px] top-4 bottom-4 w-0.5 bg-gradient-to-b from-cyan-400/80 via-sky-500/45 to-slate-700/30"
                  aria-hidden="true"
                />

                {pulse.events.map((ev) => {
                  const vis = getEventVisuals(ev.kind);
                  const Icon = vis.icon;
                  const srcMeta = getSourceBadgeMeta(ev.sourceType);
                  const isExpanded = expandedEventId === `${scopeKey}:${ev.id}`;

                  return (
                    <div key={ev.id} className="relative">
                      {/* Chronological Event Marker */}
                      <span
                        className={`absolute -left-[20px] sm:-left-[22px] top-4 w-3.5 h-3.5 rounded-full border-2 ${vis.dotClass}`}
                        aria-hidden="true"
                      />

                      <div
                        className={`rounded-2xl border transition ${vis.bgClass} ${vis.borderClass}`}
                      >
                        <button
                          type="button"
                          onClick={() => toggleEvent(ev)}
                          aria-expanded={isExpanded}
                          className="w-full text-left p-3.5 sm:p-4 flex flex-col gap-2"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span
                                className={`text-xs sm:text-sm font-extrabold font-mono shrink-0 ${vis.accentText}`}
                              >
                                {ev.localTimeLabel}
                              </span>
                              <span className={`p-1.5 rounded-lg border shrink-0 ${vis.badgeBg}`}>
                                <Icon className="w-3.5 h-3.5" />
                              </span>
                              <span className="text-xs sm:text-sm font-bold tracking-wide text-white truncate">
                                {ev.headline}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${srcMeta.className}`}
                              >
                                {srcMeta.label}
                              </span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getConfidenceClass(
                                  ev.confidence
                                )}`}
                              >
                                {ev.confidence}
                              </span>
                              <span className="text-slate-400 ml-0.5">
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
                                )}
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-xs sm:text-[13px] text-slate-200 leading-relaxed">
                              {ev.explanation}
                            </p>
                            {ev.observationTime && (
                              <span className="text-[10px] text-emerald-300/80 font-mono shrink-0">
                                Obs: {formatTimeInTimezone(ev.observationTime, location.timezone, settings.clockFormat)}
                              </span>
                            )}
                          </div>
                        </button>

                        {/* Expanded Underlying Forecast & Provenance Inspector */}
                        {isExpanded && (
                          <div className="px-3.5 sm:px-4 pb-4 pt-2 border-t border-white/10 space-y-3">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                              <div className="rounded-xl bg-slate-950/70 border border-slate-800/80 p-2.5">
                                <div className="text-[10px] text-slate-400 uppercase">Temp / Feels</div>
                                <div className="font-bold text-white mt-0.5">
                                  {formatTemp(ev.details.temperature, settings.tempUnit)}
                                  <span className="text-slate-400 font-normal">
                                    {" "}
                                    / {formatTemp(ev.details.feelsLike, settings.tempUnit)}
                                  </span>
                                </div>
                              </div>
                              <div className="rounded-xl bg-slate-950/70 border border-slate-800/80 p-2.5">
                                <div className="text-[10px] text-slate-400 uppercase">Rain Prob / Amt</div>
                                <div className="font-bold text-cyan-300 mt-0.5">
                                  {ev.details.rainProbability !== null
                                    ? `${ev.details.rainProbability}%`
                                    : "—"}{" "}
                                  • {formatRain(ev.details.precipitation, settings.rainUnit)}
                                </div>
                              </div>
                              <div className="rounded-xl bg-slate-950/70 border border-slate-800/80 p-2.5">
                                <div className="text-[10px] text-slate-400 uppercase">Wind &amp; Dir</div>
                                <div className="font-bold text-sky-300 mt-0.5">
                                  {formatWind(ev.details.windSpeed, settings.windUnit)} (
                                  {windDirectionToCompass(ev.details.windDirection)})
                                </div>
                              </div>
                              <div className="rounded-xl bg-slate-950/70 border border-slate-800/80 p-2.5">
                                <div className="text-[10px] text-slate-400 uppercase">Clouds / Pressure</div>
                                <div className="font-bold text-slate-200 mt-0.5">
                                  {ev.details.cloudCover ?? "—"}% •{" "}
                                  {ev.details.pressure ? `${Math.round(ev.details.pressure)} hPa` : "—"}
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-400 bg-slate-950/55 rounded-xl px-3 py-2 border border-slate-800/70">
                              <div className="space-y-0.5">
                                <div>
                                  <strong className="text-slate-300">Source:</strong> {ev.sourceProvider}
                                </div>
                                <div>
                                  <strong className="text-slate-300">Valid Time:</strong>{" "}
                                  {ev.localTimeLabel} ({ev.hoursAhead === 0 ? "Current hour" : `+${ev.hoursAhead}h forecast`}) •{" "}
                                  <strong className="text-slate-300">Freshness:</strong> {ev.dataFreshness}
                                </div>
                              </div>

                              {ev.radarRelevant && (
                                <button
                                  type="button"
                                  onClick={() => onNavigate("radar")}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-100 text-xs font-semibold shrink-0 transition"
                                >
                                  <Radio className="w-3.5 h-3.5" />
                                  Open Live Radar
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Attribution & Data Separation Strip */}
        <div className="relative z-10 px-5 sm:px-6 py-2.5 bg-slate-950/70 border-t border-white/5 flex flex-wrap items-center justify-between text-[10px] text-slate-400 gap-2">
          <span>
            Radar observations &amp; model forecasts are strictly separated. {photo.disclaimer}
          </span>
          <span>
            Visual: {photo.title} ({photo.license})
          </span>
        </div>
      </section>

      {/* ================================================================
          SHARE AS PNG (9:16 • 1080 × 1920) PREVIEW & DOWNLOAD MODAL
         ================================================================ */}
      {shareModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-[#071124] border border-cyan-500/35 shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">
                  Share Weather Pulse as 9:16 PNG (1080 × 1920)
                </h3>
                <p className="text-[11px] text-slate-400">
                  9:16 vertical format with headline, metrics, top timeline events &amp; confidence
                </p>
              </div>
              <button
                onClick={() => setShareModalOpen(false)}
                className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300"
                aria-label="Close share preview"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex justify-center bg-slate-950/60">
              <canvas
                ref={shareCanvasRef}
                width={1080}
                height={1920}
                className="w-full max-w-[300px] aspect-[9/16] rounded-2xl border border-cyan-500/25 shadow-2xl block"
              />
            </div>

            <div className="px-5 py-4 border-t border-slate-800 flex flex-wrap items-center justify-end gap-2">
              <button
                onClick={handleNativeSharePng}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-semibold border border-slate-700 transition"
              >
                <Share2 className="w-4 h-4" />
                Share Image
              </button>
              <button
                onClick={handleDownloadPng}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-extrabold transition"
              >
                <Download className="w-4 h-4" />
                Download 9:16 PNG
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
