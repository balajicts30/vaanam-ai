"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Cloud,
  CloudRain,
  Gauge,
  KeyRound,
  Layers,
  Loader2,
  Map as MapIcon,
  Satellite,
  Thermometer,
  Wind,
} from "lucide-react";
import { formatRain, formatTemp, formatWind, windDirectionToCompass } from "@/lib/units";
import { apiFetchMapConfig, apiFetchWeatherGrid } from "@/lib/client-api";
import { UserSettings, WeatherGridNode, WeatherIntelligencePayload } from "@/types/weather";

type LayerId = "temperature" | "precipitation" | "clouds" | "wind" | "pressure";
type BasemapStyle = "osm" | "dark" | "satellite";

interface MapProviderConfig {
  openWeatherEnabled: boolean;
  mapboxEnabled: boolean;
  maptilerEnabled: boolean;
}

const OWM_LAYER_MAP: Record<LayerId, string> = {
  temperature: "temp_new",
  precipitation: "precipitation_new",
  clouds: "clouds_new",
  wind: "wind_new",
  pressure: "pressure_new",
};

interface Props {
  payload: WeatherIntelligencePayload;
  settings: UserSettings;
}

export function WeatherMapsView({ payload, settings }: Props) {
  const { location } = payload;
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletRef = useRef<any>(null);
  const baseLayerRef = useRef<any>(null);
  const weatherTileLayerRef = useRef<any>(null);
  const markersGroupRef = useRef<any>(null);

  const [layer, setLayer] = useState<LayerId>("temperature");
  const [basemap, setBasemap] = useState<BasemapStyle>("osm");
  const [providerConfig, setProviderConfig] = useState<MapProviderConfig>({
    openWeatherEnabled: false,
    mapboxEnabled: false,
    maptilerEnabled: false,
  });
  const [nodes, setNodes] = useState<WeatherGridNode[]>([]);
  const [loading, setLoading] = useState(true);

  // Check which server-side map providers have API keys configured
  useEffect(() => {
    apiFetchMapConfig()
      .then((cfg) => setProviderConfig(cfg))
      .catch(() => {});
  }, []);

  // Load real 3×3 Open-Meteo spatial grid around the selected location
  useEffect(() => {
    let active = true;
    setLoading(true);
    apiFetchWeatherGrid(location.latitude, location.longitude)
      .then((list) => {
        if (active) setNodes(list);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [location.latitude, location.longitude]);

  // Initialize Leaflet map
  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !mapRef.current) return;

      if (leafletRef.current) {
        leafletRef.current.remove();
        leafletRef.current = null;
      }

      const map = L.map(mapRef.current, {
        center: [location.latitude, location.longitude],
        zoom: 7,
      });

      markersGroupRef.current = L.layerGroup().addTo(map);
      leafletRef.current = map;
    };
    init();
    return () => {
      cancelled = true;
      if (leafletRef.current) {
        leafletRef.current.remove();
        leafletRef.current = null;
      }
    };
  }, [location.latitude, location.longitude]);

  // Update basemap tile layer (OpenStreetMap Standard, CARTO Dark, or Mapbox/MapTiler Satellite)
  useEffect(() => {
    const updateBasemap = async () => {
      const L = (await import("leaflet")).default;
      if (!leafletRef.current) return;
      if (baseLayerRef.current) {
        leafletRef.current.removeLayer(baseLayerRef.current);
      }

      let tileUrl = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
      let attribution =
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors | Regional Grid: Open-Meteo';

      if (basemap === "dark") {
        tileUrl = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
        attribution = "&copy; OpenStreetMap contributors &copy; CARTO | Regional Grid: Open-Meteo";
      } else if (basemap === "satellite" && providerConfig.mapboxEnabled) {
        tileUrl = `/api/map/tiles/mapbox/satellite-streets-v12/{z}/{x}/{y}`;
        attribution = "&copy; Mapbox &copy; OpenStreetMap";
      } else if (basemap === "satellite" && providerConfig.maptilerEnabled) {
        tileUrl = `/api/map/tiles/maptiler/hybrid/{z}/{x}/{y}`;
        attribution = "&copy; MapTiler &copy; OpenStreetMap";
      }

      baseLayerRef.current = L.tileLayer(tileUrl, { attribution, maxZoom: 19 }).addTo(
        leafletRef.current
      );
      baseLayerRef.current.bringToBack();
    };
    updateBasemap();
  }, [basemap, providerConfig.mapboxEnabled, providerConfig.maptilerEnabled, location.latitude, location.longitude]);

  // Overlay OpenWeatherMap heatmap weather tiles when OPENWEATHER_API_KEY is configured
  useEffect(() => {
    const updateWeatherTile = async () => {
      const L = (await import("leaflet")).default;
      if (!leafletRef.current) return;
      if (weatherTileLayerRef.current) {
        leafletRef.current.removeLayer(weatherTileLayerRef.current);
        weatherTileLayerRef.current = null;
      }
      if (!providerConfig.openWeatherEnabled) return;

      const owmLayer = OWM_LAYER_MAP[layer];
      weatherTileLayerRef.current = L.tileLayer(
        `/api/map/tiles/owm/${owmLayer}/{z}/{x}/{y}`,
        { opacity: 0.65, zIndex: 8 }
      ).addTo(leafletRef.current);
    };
    updateWeatherTile();
  }, [layer, providerConfig.openWeatherEnabled, location.latitude, location.longitude]);

  // Render real regional 3×3 spatial grid markers onto Leaflet map
  useEffect(() => {
    const drawLayer = async () => {
      const L = (await import("leaflet")).default;
      if (!leafletRef.current || !markersGroupRef.current) return;
      markersGroupRef.current.clearLayers();

      for (const n of nodes) {
        let color = "#38bdf8";
        let label = "—";
        if (layer === "temperature") {
          const t = n.temperature ?? 25;
          color = t >= 35 ? "#ef4444" : t >= 30 ? "#f59e0b" : t >= 22 ? "#22d3ee" : "#3b82f6";
          label = formatTemp(n.temperature, settings.tempUnit);
        } else if (layer === "precipitation") {
          const p = n.precipitation ?? 0;
          color = p >= 5 ? "#1d4ed8" : p > 0 ? "#06b6d4" : "#334155";
          label = formatRain(n.precipitation, settings.rainUnit);
        } else if (layer === "clouds") {
          const c = n.cloudCover ?? 0;
          color = c >= 75 ? "#94a3b8" : c >= 35 ? "#64748b" : "#0284c7";
          label = `${n.cloudCover ?? "—"}%`;
        } else if (layer === "wind") {
          const w = n.windSpeed ?? 0;
          color = w >= 30 ? "#f43f5e" : w >= 15 ? "#a855f7" : "#38bdf8";
          label = `${formatWind(n.windSpeed, settings.windUnit)} ${windDirectionToCompass(n.windDirection)}`;
        } else if (layer === "pressure") {
          const pr = n.pressure ?? 1013;
          color = pr <= 1004 ? "#f43f5e" : pr >= 1018 ? "#10b981" : "#818cf8";
          label = n.pressure ? `${Math.round(n.pressure)} hPa` : "—";
        }

        // Translucent field circle (lighter if OWM heatmap tiles are active)
        L.circle([n.lat, n.lon], {
          radius: 58000,
          color,
          fillColor: color,
          fillOpacity: providerConfig.openWeatherEnabled ? 0.08 : 0.22,
          weight: 1,
        }).addTo(markersGroupRef.current);

        const icon = L.divIcon({
          className: "vaanam-grid-label",
          html: `<div style="background:rgba(4,9,20,0.88);border:1px solid ${color};color:#f8fafc;padding:4px 8px;border-radius:10px;font-size:11px;font-weight:700;white-space:nowrap;box-shadow:0 4px 12px rgba(0,0,0,0.5);text-align:center;">${label}</div>`,
          iconSize: [78, 26],
          iconAnchor: [39, 13],
        });

        L.marker([n.lat, n.lon], { icon })
          .bindPopup(
            `<strong>Grid Point (${n.lat.toFixed(2)}, ${n.lon.toFixed(2)})</strong><br/>Temp: ${formatTemp(
              n.temperature,
              settings.tempUnit
            )}<br/>Rain: ${formatRain(n.precipitation, settings.rainUnit)}<br/>Wind: ${formatWind(
              n.windSpeed,
              settings.windUnit
            )} ${windDirectionToCompass(n.windDirection)}<br/>Clouds: ${n.cloudCover ?? "—"}%<br/>Pressure: ${
              n.pressure ? `${n.pressure.toFixed(1)} hPa` : "—"
            }`
          )
          .addTo(markersGroupRef.current);
      }
    };

    drawLayer();
  }, [nodes, layer, providerConfig.openWeatherEnabled, settings.tempUnit, settings.windUnit, settings.rainUnit]);

  const hasSatelliteBasemap = providerConfig.mapboxEnabled || providerConfig.maptilerEnabled;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Layers className="w-6 h-6 text-cyan-400" />
            Interactive Weather Map — {location.name}
          </h1>
          <p className="text-xs text-slate-400">
            OpenStreetMap &amp; CARTO Dark basemaps + real regional spatial grid
            {providerConfig.openWeatherEnabled ? " + live OpenWeatherMap heatmap tiles" : ""}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: "temperature", label: "Temperature", icon: Thermometer },
            { id: "precipitation", label: "Rainfall", icon: CloudRain },
            { id: "clouds", label: "Cloud Cover", icon: Cloud },
            { id: "wind", label: "Wind Speed & Dir", icon: Wind },
            { id: "pressure", label: "Pressure / Systems", icon: Gauge },
          ].map((btn) => {
            const Icon = btn.icon;
            return (
              <button
                key={btn.id}
                onClick={() => setLayer(btn.id as LayerId)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition ${
                  layer === btn.id
                    ? "bg-cyan-500/20 border-cyan-400/50 text-cyan-100"
                    : "bg-slate-900/70 border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {btn.label}
              </button>
            );
          })}

          <div className="inline-flex rounded-xl bg-slate-900/90 border border-slate-700 p-0.5 ml-1">
            <button
              onClick={() => setBasemap("osm")}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                basemap === "osm"
                  ? "bg-emerald-500/25 text-emerald-100"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" />
              OpenStreetMap
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
            {hasSatelliteBasemap && (
              <button
                onClick={() => setBasemap("satellite")}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                  basemap === "satellite"
                    ? "bg-indigo-500/25 text-indigo-100"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Satellite className="w-3.5 h-3.5" />
                Satellite
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Map Provider Status Strip */}
      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/80 border border-slate-800 text-slate-300">
          <MapIcon className="w-3 h-3 text-emerald-400" />
          Basemap:{" "}
          <strong className="text-emerald-300">
            {basemap === "osm"
              ? "OpenStreetMap Standard"
              : basemap === "satellite"
              ? providerConfig.mapboxEnabled
                ? "Mapbox Satellite"
                : "MapTiler Satellite"
              : "CARTO Dark"}
          </strong>
        </span>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/80 border border-slate-800 text-slate-300">
          <KeyRound className="w-3 h-3 text-cyan-400" />
          OpenWeatherMap Heatmap:{" "}
          <strong className={providerConfig.openWeatherEnabled ? "text-emerald-400" : "text-slate-400"}>
            {providerConfig.openWeatherEnabled ? "ACTIVE" : "OPTIONAL"}
          </strong>
        </span>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden relative">
        {loading && (
          <div className="absolute top-3 right-3 z-20 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/90 border border-cyan-500/30 text-xs text-cyan-300">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading spatial grid...
          </div>
        )}
        <div ref={mapRef} className="h-[540px] w-full z-10" />
      </div>
    </div>
  );
}
