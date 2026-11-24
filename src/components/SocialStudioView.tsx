"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Copy,
  Download,
  Film,
  Languages,
  Loader2,
  Palette,
  Pause,
  Play,
  Share2,
  Sparkles,
} from "lucide-react";
import { generateFacebookCaption } from "@/lib/studio/captions";
import {
  Canvas2DLike,
  renderStoryFrame,
  STORY_DURATION_SEC,
  StoryRenderPayload,
} from "@/lib/studio/story-renderer";
import { STORY_THEMES } from "@/lib/studio/themes";
import { IS_STATIC_PAGES } from "@/lib/client-api";
import { formatDateShort, formatHourLabel, formatTemp } from "@/lib/units";
import { getWeatherCodeInfo } from "@/lib/weather-codes";
import {
  ContentLanguage,
  StoryThemeId,
  UserSettings,
  WeatherIntelligencePayload,
} from "@/types/weather";

interface Props {
  payload: WeatherIntelligencePayload;
  settings: UserSettings;
}

export function SocialStudioView({ payload, settings }: Props) {
  const [dayIdx, setDayIdx] = useState(1); // Default Tomorrow (0=Today, 1=Tomorrow)
  const [themeId, setThemeId] = useState<StoryThemeId>(settings.preferredTheme);
  const [language, setLanguage] = useState<ContentLanguage>(settings.contentLanguage);

  // Caption state (editable override keyed to generated caption)
  const [captionEdits, setCaptionEdits] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);

  // Single-page animated 9:16 Rain Story state
  const [playing, setPlaying] = useState(true);
  const [storyTime, setStoryTime] = useState(0);
  const [renderingMp4, setRenderingMp4] = useState(false);
  const [mp4Error, setMp4Error] = useState<string | null>(null);

  const storyCanvasRef = useRef<HTMLCanvasElement>(null);

  const selectedDay = payload.daily30[dayIdx] || payload.daily30[0];
  const info = getWeatherCodeInfo(selectedDay?.weatherCode ?? payload.current.weatherCode);

  const generatedCopy = useMemo(
    () =>
      generateFacebookCaption({
        payload,
        dayIndex: dayIdx,
        language,
        tempUnit: settings.tempUnit,
        windUnit: settings.windUnit,
        rainUnit: settings.rainUnit,
      }),
    [payload, dayIdx, language, settings.tempUnit, settings.windUnit, settings.rainUnit]
  );

  const captionKey = `${payload.location.id}:${dayIdx}:${language}`;
  const caption = captionEdits[captionKey] ?? generatedCopy.caption;

  const renderPayload: StoryRenderPayload = useMemo(() => {
    const { weekday, dayMonth } = formatDateShort(
      selectedDay?.date || payload.retrievedAt.slice(0, 10)
    );
    const dayHours = payload.hourly.slice(dayIdx * 24, dayIdx * 24 + 24);
    const sampleHours = [6, 10, 14, 18, 22]
      .map((h) => dayHours[h])
      .filter(Boolean)
      .map((h) => ({
        label: formatHourLabel(h.time, settings.clockFormat),
        temp: formatTemp(h.temperature, settings.tempUnit),
        rainPct: h.rainProbability ?? 0,
        precipMm: h.precipitation ?? 0,
      }));

    return {
      city: payload.location.name,
      region: [payload.location.state, payload.location.country].filter(Boolean).join(", "),
      dateLabel: `${weekday}, ${dayMonth}`,
      conditionLabel: info.label,
      conditionEmoji: info.emoji,
      weatherCategory: info.category,
      headline: generatedCopy.headline,
      shortSummary: generatedCopy.shortSummary,
      tempMinC: selectedDay?.tempMin ?? payload.current.temperature,
      tempMaxC: selectedDay?.tempMax ?? payload.current.temperature,
      currentTempC: payload.current.temperature,
      rainProbability: selectedDay?.rainProbability ?? payload.current.rainProbability,
      heavyRainProbability: selectedDay?.heavyRainProbability ?? null,
      precipitationMm: selectedDay?.precipitationSum ?? payload.current.precipitation,
      windKmh: selectedDay?.windSpeedMax ?? payload.current.windSpeed,
      humidityPct: selectedDay?.humidityMean ?? payload.current.humidity,
      confidence: selectedDay?.confidence ?? "MODERATE",
      tempUnit: settings.tempUnit,
      rainUnit: settings.rainUnit,
      windUnit: settings.windUnit,
      themeId,
      designVariant: 0,
      timelinePreview: sampleHours,
    };
  }, [
    payload,
    selectedDay,
    dayIdx,
    info,
    generatedCopy,
    settings.clockFormat,
    settings.tempUnit,
    settings.rainUnit,
    settings.windUnit,
    themeId,
  ]);

  // Animate 9:16 (1080×1920) single-page Rain Story canvas in real time
  useEffect(() => {
    const canvas = storyCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d") as unknown as Canvas2DLike | null;
    if (!ctx) return;

    if (!playing) {
      renderStoryFrame(ctx, 1080, 1920, storyTime, renderPayload);
      return;
    }

    let rafId = 0;
    let lastTs = performance.now();
    let localT = storyTime;

    const tick = (now: number) => {
      const dt = (now - lastTs) / 1000;
      lastTs = now;
      localT = (localT + dt) % STORY_DURATION_SEC;
      setStoryTime(localT);
      renderStoryFrame(ctx, 1080, 1920, localT, renderPayload);
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, renderPayload]);

  const downloadCanvasPng = (canvas: HTMLCanvasElement | null, filename: string) => {
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = filename;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const handleCopyCaption = async () => {
    await navigator.clipboard.writeText(caption);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: generatedCopy.headline,
          text: caption,
        });
      } catch {
        // User cancelled
      }
    } else {
      handleCopyCaption();
    }
  };

  const handleExportVideo = async () => {
    setRenderingMp4(true);
    setMp4Error(null);
    try {
      const safeCity = payload.location.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

      if (IS_STATIC_PAGES) {
        const offscreen = document.createElement("canvas");
        offscreen.width = 1080;
        offscreen.height = 1920;
        const ctx = offscreen.getContext("2d") as unknown as Canvas2DLike | null;
        if (!ctx || typeof MediaRecorder === "undefined") {
          throw new Error("Browser video recording is not supported on this device.");
        }
        const mimeType = MediaRecorder.isTypeSupported("video/mp4")
          ? "video/mp4"
          : MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
          ? "video/webm;codecs=vp9"
          : "video/webm";
        const ext = mimeType.includes("mp4") ? "mp4" : "webm";
        const stream = offscreen.captureStream(24);
        const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 4_500_000 });
        const chunks: Blob[] = [];
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };
        const done = new Promise<Blob>((resolve) => {
          recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
        });
        recorder.start();
        const startTime = performance.now();
        await new Promise<void>((resolve) => {
          const step = (now: number) => {
            const elapsed = (now - startTime) / 1000;
            renderStoryFrame(ctx, 1080, 1920, Math.min(STORY_DURATION_SEC, elapsed), renderPayload);
            if (elapsed < STORY_DURATION_SEC) {
              requestAnimationFrame(step);
            } else {
              recorder.stop();
              resolve();
            }
          };
          requestAnimationFrame(step);
        });
        const blob = await done;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `vaanam-${safeCity}-9x16-rain-video.${ext}`;
        a.click();
        URL.revokeObjectURL(url);
        return;
      }

      const res = await fetch("/api/studio/render-story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(renderPayload),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `MP4 export failed (HTTP ${res.status})`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `vaanam-${safeCity}-9x16-rain-video.mp4`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setMp4Error(err instanceof Error ? err.message : "Failed to render 9:16 video");
    } finally {
      setRenderingMp4(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Studio Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-violet-400" />
            Social Weather Studio — {payload.location.name}
          </h1>
          <p className="text-xs text-slate-400">
            Unified 9:16 (1080 × 1920) single-page animated Rain Video, 9:16 PNG &amp; bilingual social captions
          </p>
        </div>

        <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-violet-500/20 border border-violet-400/40 text-violet-100 text-xs font-bold">
          <Film className="w-3.5 h-3.5 text-cyan-300" />
          9:16 Format Only (1080 × 1920)
        </span>
      </div>

      {/* Controls Bar: Forecast Day + Language + Theme Selector */}
      <div className="glass-card rounded-2xl p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold uppercase text-slate-400 mr-1">
              Forecast Day:
            </span>
            {payload.daily30.slice(0, 5).map((d, idx) => {
              const label =
                idx === 0 ? "Today" : idx === 1 ? "Tomorrow" : formatDateShort(d.date).weekday;
              return (
                <button
                  key={d.date}
                  onClick={() => setDayIdx(idx)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                    dayIdx === idx
                      ? "bg-cyan-500/20 border-cyan-400/50 text-cyan-100"
                      : "bg-slate-900/70 border-slate-800 text-slate-400"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <div className="inline-flex items-center rounded-xl bg-slate-900/90 border border-slate-700 p-1">
            <Languages className="w-3.5 h-3.5 text-cyan-400 ml-2 mr-1" />
            {(
              [
                { id: "en", label: "English" },
                { id: "ta", label: "தமிழ்" },
                { id: "bilingual", label: "Tamil + EN" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                onClick={() => setLanguage(opt.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                  language === opt.id ? "bg-cyan-500/25 text-cyan-100" : "text-slate-400"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* 10 Visual Themes */}
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-violet-400" />
            Select Visual Theme (10 Studio Themes)
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {STORY_THEMES.map((t) => {
              const active = themeId === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setThemeId(t.id)}
                  className={`rounded-xl p-2.5 text-left border transition ${
                    active
                      ? "border-cyan-400 bg-cyan-500/15"
                      : "border-slate-800 bg-slate-950/60 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-white/20"
                      style={{ background: `linear-gradient(135deg, ${t.bgStops[1]}, ${t.accent})` }}
                    />
                    <span className="text-xs font-semibold text-slate-100 truncate">{t.name}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">{t.tagline}</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* UNIFIED 9:16 SINGLE-PAGE ANIMATED RAIN VIDEO & PNG STUDIO */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="glass-card rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">
              9:16 Single-Page Rain Preview (1080 × 1920 • {STORY_DURATION_SEC}s Loop)
            </h2>
            <span className="text-xs font-mono text-cyan-300">
              {storyTime.toFixed(1)}s / {STORY_DURATION_SEC}.0s
            </span>
          </div>

          <div className="w-full max-w-[310px] mx-auto aspect-[9/16] rounded-3xl overflow-hidden border-2 border-cyan-400/35 shadow-2xl bg-slate-950">
            <canvas
              ref={storyCanvasRef}
              width={1080}
              height={1920}
              className="w-full h-full block"
            />
          </div>

          <div className="flex items-center gap-3 max-w-[360px] mx-auto">
            <button
              onClick={() => setPlaying((p) => !p)}
              className="p-2 rounded-xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-100"
              aria-label={playing ? "Pause preview" : "Play preview"}
            >
              {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            <input
              type="range"
              min={0}
              max={STORY_DURATION_SEC}
              step={0.1}
              value={Math.min(storyTime, STORY_DURATION_SEC)}
              onChange={(e) => {
                setPlaying(false);
                setStoryTime(Number(e.target.value));
              }}
              className="flex-1 accent-cyan-400"
            />
          </div>

          {mp4Error && (
            <div className="rounded-xl bg-rose-950/35 border border-rose-500/40 p-3 text-xs text-rose-200">
              {mp4Error}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
            <button
              onClick={handleExportVideo}
              disabled={renderingMp4}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 hover:from-cyan-400 hover:to-violet-400 text-slate-950 font-extrabold text-xs transition disabled:opacity-60"
            >
              {renderingMp4 ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Rendering 9:16 Video...
                </>
              ) : (
                <>
                  <Film className="w-4 h-4" /> Export 9:16 Rain Video
                </>
              )}
            </button>

            <button
              onClick={() =>
                downloadCanvasPng(
                  storyCanvasRef.current,
                  `vaanam-${payload.location.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-9x16-1080x1920.png`
                )
              }
              className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-100 font-bold text-xs border border-cyan-400/40 transition"
            >
              <Download className="w-4 h-4" /> Download 9:16 PNG
            </button>
          </div>
        </div>

        {/* Right Column: Editable Social Caption + Single-Page Feature Summary */}
        <div className="glass-card rounded-2xl p-6 flex flex-col justify-between gap-5">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-white">
                Social Caption (Editable • Ready for Reels, Stories &amp; Status)
              </h2>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleCopyCaption}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-100 text-xs font-semibold"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? "Copied!" : "Copy"}
                </button>
                <button
                  onClick={handleNativeShare}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 text-xs font-semibold"
                >
                  <Share2 className="w-3.5 h-3.5" /> Share
                </button>
              </div>
            </div>

            <textarea
              value={caption}
              onChange={(e) =>
                setCaptionEdits((prev) => ({ ...prev, [captionKey]: e.target.value }))
              }
              rows={13}
              className="w-full rounded-2xl bg-slate-950/75 border border-slate-800 p-4 text-xs text-slate-200 leading-relaxed focus:outline-none focus:border-cyan-400/60 font-sans"
            />
          </div>

          <div className="space-y-2 text-xs">
            <div className="rounded-xl bg-slate-950/60 border border-slate-800 p-3">
              <strong className="text-cyan-300">Single-Page 9:16 Layout:</strong> Rain probability %, expected rainfall, heavy-rain risk, wind, humidity, confidence, 5-slot hourly rain timeline &amp; advisory — all visible without scene cuts.
            </div>
            <p className="text-[11px] text-slate-400">
              All values are populated directly from live ECMWF IFS 0.25° &amp; ENS 51-member runs.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
