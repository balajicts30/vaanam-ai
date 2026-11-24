"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Cloud,
  ExternalLink,
  Map as MapIcon,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  Radio,
  RefreshCw,
  Satellite,
  Wind,
} from "lucide-react";
import { getZoomEarthUrl } from "@/lib/location";
import { apiFetchRadar } from "@/lib/client-api";
import { formatRain, formatWind, windDirectionToCompass } from "@/lib/units";
import { RainViewerPayload, UserSettings, WeatherIntelligencePayload } from "@/types/weather";

interface Props {
  payload: WeatherIntelligencePayload;
  settings: UserSettings;
}

export function LiveRadarView({ payload, settings }: Props) {
  const { location, current } = payload;
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const baseLayerRef = useRef<any>(null);
  const overlayLayerRef = useRef<any>(null);

  const [radarData, setRadarData] = useState<RainViewerPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"radar" | "satellite" | "zoomearth">("radar");
  const [basemap, setBasemap] = useState<"osm" | "dark">("osm");
  const [playing, setPlaying] = useState(true);
  const [frameIdx, setFrameIdx] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const zoomEarthUrl = getZoomEarthUrl(location);

  const fetchRadar = async () => {
    setLoading(true);
    setError(null);
    try {
      const json = await apiFetchRadar();
      setRadarData(json);
      setFrameIdx(Math.max(0, (json.radarPast?.length || 1) - 1));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load live radar frames");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRadar();
  }, []);

  const activeFrames =
    mode === "satellite"
      ? (radarData?.satelliteInfrared || []).map((f) => ({ ...f, kind: "IR SATELLITE" }))
      : [
          ...(radarData?.radarPast || []).map((f) => ({ ...f, kind: "OBSERVED RADAR" })),
          ...(radarData?.radarNowcast || []).map((f) => ({ ...f, kind: "SHORT-RANGE NOWCAST" })),
        ];

  // Initialize Leaflet map
  useEffect(() => {
    if (mode === "zoomearth") return;
    let cancelled = false;

    const initMap = async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !mapContainerRef.current) return;

      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }

      const map = L.map(mapContainerRef.current, {
        center: [location.latitude, location.longitude],
        zoom: 7,
        zoomControl: true,
      });

      baseLayerRef.current = L.tileLayer(
        basemap === "osm"
          ? "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          : "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        {
          attribution:
            basemap === "osm"
              ? '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors | Radar: RainViewer'
              : "&copy; OpenStreetMap contributors &copy; CARTO | Radar: RainViewer",
          maxZoom: 19,
        }
      ).addTo(map);

      L.circleMarker([location.latitude, location.longitude], {
        radius: 8,
        color: "#22d3ee",
        fillColor: "#06b6d4",
        fillOpacity: 0.9,
        weight: 2,
      })
        .addTo(map)
        .bindPopup(`<strong>${location.name}</strong><br/>Live Radar Centre`);

      leafletMapRef.current = map;
    };

    initMap();
    return () => {
      cancelled = true;
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, [location.latitude, location.longitude, location.name, mode]);

  // Switch basemap dynamically between OpenStreetMap Standard and CARTO Dark
  useEffect(() => {
    if (mode === "zoomearth" || !leafletMapRef.current) return;
    const swapBasemap = async () => {
      const L = (await import("leaflet")).default;
      if (!leafletMapRef.current) return;
      if (baseLayerRef.current) {
        leafletMapRef.current.removeLayer(baseLayerRef.current);
      }
      baseLayerRef.current = L.tileLayer(
        basemap === "osm"
          ? "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          : "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        {
          attribution:
            basemap === "osm"
              ? '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors | Radar: RainViewer'
              : "&copy; OpenStreetMap contributors &copy; CARTO | Radar: RainViewer",
          maxZoom: 19,
        }
      ).addTo(leafletMapRef.current);
      baseLayerRef.current.bringToBack();
    };
    swapBasemap();
  }, [basemap, mode]);

  // Update active radar/satellite tile layer when frame changes
  useEffect(() => {
    if (mode === "zoomearth" || !leafletMapRef.current || !radarData || !activeFrames.length) return;
    const safeIdx = frameIdx % activeFrames.length;
    const frame = activeFrames[safeIdx];
    if (!frame) return;

    const updateTile = async () => {
      const L = (await import("leaflet")).default;
      if (!leafletMapRef.current) return;
      if (overlayLayerRef.current) {
        leafletMapRef.current.removeLayer(overlayLayerRef.current);
      }
      const tileUrl =
        mode === "satellite"
          ? `${radarData.host}${frame.path}/256/{z}/{x}/{y}/0/0_0.png`
          : `${radarData.host}${frame.path}/256/{z}/{x}/{y}/2/1_1.png`;

      overlayLayerRef.current = L.tileLayer(tileUrl, {
        opacity: 0.72,
        zIndex: 10,
      }).addTo(leafletMapRef.current);
    };

    updateTile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frameIdx, mode, radarData]);

  // Animation loop
  useEffect(() => {
    if (!playing || mode === "zoomearth" || activeFrames.length <= 1) return;
    const id = setInterval(() => {
      setFrameIdx((prev) => (prev + 1) % activeFrames.length);
    }, 850);
    return () => clearInterval(id);
  }, [playing, mode, activeFrames.length]);

  const toggleFullscreen = () => {
    if (!wrapperRef.current) return;
    if (!document.fullscreenElement) {
      wrapperRef.current.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const currentFrame = activeFrames[frameIdx % Math.max(activeFrames.length, 1)];
  const lastObservedTime = radarData?.radarPast?.length
    ? new Date(radarData.radarPast[radarData.radarPast.length - 1].time * 1000).toLocaleTimeString()
    : "—";

  return (
    <div ref={wrapperRef} className="space-y-4 bg-[#040914] rounded-3xl">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Radio className="w-6 h-6 text-emerald-400 animate-pulse" />
            Live Weather Radar — {location.name}
          </h1>
          <p className="text-xs text-slate-400">
            Observed precipitation radar &amp; IR satellite imagery (RainViewer) + Zoom Earth direct integration
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl bg-slate-900/90 border border-cyan-500/25 p-1">
            <button
              onClick={() => {
                setMode("radar");
                setFrameIdx(0);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                mode === "radar" ? "bg-cyan-500/25 text-cyan-100" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Live Radar
            </button>
            <button
              onClick={() => {
                setMode("satellite");
                setFrameIdx(0);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
                mode === "satellite" ? "bg-cyan-500/25 text-cyan-100" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Satellite className="w-3.5 h-3.5" /> IR Satellite
            </button>
            <button
              onClick={() => setMode("zoomearth")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                mode === "zoomearth" ? "bg-cyan-500/25 text-cyan-100" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Zoom Earth View
            </button>
          </div>

          {mode !== "zoomearth" && (
            <div className="inline-flex rounded-xl bg-slate-900/90 border border-slate-700 p-0.5">
              <button
                onClick={() => setBasemap("osm")}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                  basemap === "osm"
                    ? "bg-emerald-500/25 text-emerald-100"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <MapIcon className="w-3.5 h-3.5" />
                OSM
              </button>
              <button
                onClick={() => setBasemap("dark")}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                  basemap === "dark"
                    ? "bg-cyan-500/25 text-cyan-100"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Dark
              </button>
            </div>
          )}

          <a
            href={zoomEarthUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-100 text-xs font-semibold transition"
          >
            Open in Zoom Earth <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 hover:border-cyan-400/50"
            title="Toggle full-screen radar"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <button
            onClick={fetchRadar}
            className="p-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 hover:border-cyan-400/50"
            title="Refresh radar frames"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-cyan-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* Main Radar Canvas + Info Panel */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        <div className="xl:col-span-3 glass-card rounded-2xl overflow-hidden flex flex-col">
          {mode === "zoomearth" ? (
            <div className="relative h-[540px] w-full bg-slate-950 flex flex-col">
              <div className="px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-slate-300">
                  Embedded Zoom Earth radar centred on <strong>{location.name}</strong>. If your browser blocks third-party embedding, use the direct link or switch to Live Radar.
                </span>
                <a
                  href={zoomEarthUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-cyan-300 font-semibold hover:underline flex items-center gap-1"
                >
                  Launch Full Zoom Earth <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <iframe
                src={zoomEarthUrl}
                title={`Zoom Earth Live Radar - ${location.name}`}
                className="w-full flex-1 border-0"
                allowFullScreen
              />
            </div>
          ) : (
            <>
              <div ref={mapContainerRef} className="h-[500px] w-full z-10" />
              {/* Radar Playback Bar */}
              <div className="p-3.5 bg-slate-950/90 border-t border-slate-800 flex flex-wrap items-center gap-3">
                <button
                  onClick={() => setPlaying((p) => !p)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-100 text-xs font-semibold"
                >
                  {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  {playing ? "Pause" : "Play"}
                </button>

                <input
                  type="range"
                  min={0}
                  max={Math.max(0, activeFrames.length - 1)}
                  value={frameIdx % Math.max(activeFrames.length, 1)}
                  onChange={(e) => {
                    setPlaying(false);
                    setFrameIdx(Number(e.target.value));
                  }}
                  className="flex-1 accent-cyan-400"
                />

                {currentFrame && (
                  <div className="flex items-center gap-2 text-xs">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        currentFrame.kind === "OBSERVED RADAR"
                          ? "bg-emerald-500/20 text-emerald-300"
                          : currentFrame.kind === "IR SATELLITE"
                          ? "bg-indigo-500/20 text-indigo-300"
                          : "bg-amber-500/20 text-amber-300"
                      }`}
                    >
                      {currentFrame.kind}
                    </span>
                    <span className="font-mono text-slate-200">
                      {new Date(currentFrame.time * 1000).toLocaleTimeString()}
                    </span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Radar Information Panel */}
        <div className="glass-card rounded-2xl p-5 flex flex-col justify-between gap-4">
          <div className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-cyan-300">
              Radar &amp; Storm Telemetry
            </h2>

            {error && (
              <div className="text-xs text-rose-300 bg-rose-950/30 border border-rose-500/30 rounded-xl p-3">
                {error}
              </div>
            )}

            <div className="space-y-2.5">
              <div className="rounded-xl bg-slate-950/65 border border-slate-800 p-3">
                <div className="text-[11px] text-slate-400">Current Precipitation</div>
                <div className="text-base font-bold text-white mt-0.5">
                  {formatRain(current.precipitation, settings.rainUnit)}
                </div>
                <div className="text-[11px] text-cyan-300">
                  {current.precipitation && current.precipitation > 0.1
                    ? "Active rainfall detected in model observation"
                    : "Dry / light trace at station coordinate"}
                </div>
              </div>

              <div className="rounded-xl bg-slate-950/65 border border-slate-800 p-3">
                <div className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Wind className="w-3 h-3 text-sky-400" /> Steering Wind / Movement
                </div>
                <div className="text-base font-bold text-white mt-0.5">
                  {formatWind(current.windSpeed, settings.windUnit)} from{" "}
                  {windDirectionToCompass(current.windDirection)}
                </div>
                <div className="text-[11px] text-slate-400">
                  Cloud cover: {current.cloudCover ?? "—"}%
                </div>
              </div>

              <div className="rounded-xl bg-slate-950/65 border border-slate-800 p-3">
                <div className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Cloud className="w-3 h-3 text-indigo-400" /> Last Observed Radar Update
                </div>
                <div className="text-sm font-mono font-semibold text-emerald-300 mt-0.5">
                  {lastObservedTime}
                </div>
                <div className="text-[11px] text-slate-400">
                  Frames loaded: {radarData?.radarPast.length ?? 0} observed /{" "}
                  {radarData?.satelliteInfrared.length ?? 0} IR sat
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-cyan-950/25 border border-cyan-500/25 p-3 text-[11px] text-slate-300 leading-relaxed">
            <strong className="text-cyan-200">Data Integrity Note:</strong> Observed past radar
            frames represent live Doppler/composite echoes and are strictly distinguished from
            short-range nowcast or numerical forecast rainfall.
          </div>
        </div>
      </div>
    </div>
  );
}
