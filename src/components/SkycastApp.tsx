"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  Calendar,
  CalendarDays,
  Clock,
  CloudLightning,
  GitCompare,
  Layers,
  LayoutDashboard,
  Loader2,
  Menu,
  Radio,
  RefreshCw,
  Settings,
  Sparkles,
  Video,
  X,
} from "lucide-react";
import { PRESET_LOCATIONS } from "@/lib/location";
import { apiFetchWeather, apiReverseGeocode } from "@/lib/client-api";
import {
  GeoLocation,
  NavSection,
  UserSettings,
  WeatherIntelligencePayload,
} from "@/types/weather";
import { AiAnalystView } from "./AiAnalystView";
import { DashboardView } from "./DashboardView";
import { DataQualityFooter } from "./DataQualityFooter";
import { Forecast30DayView } from "./Forecast30DayView";
import { LiveRadarView } from "./LiveRadarView";
import { LocationSearchBar } from "./LocationSearchBar";
import { ModelComparisonView } from "./ModelComparisonView";
import { SettingsView } from "./SettingsView";
import { SocialStudioView } from "./SocialStudioView";
import { WeatherMapsView } from "./WeatherMapsView";

const SETTINGS_STORAGE_KEY = "vaanam_ai_settings_v1";

const DEFAULT_SETTINGS: UserSettings = {
  defaultLocation: PRESET_LOCATIONS[0], // Chennai
  favourites: [PRESET_LOCATIONS[0], PRESET_LOCATIONS[1], PRESET_LOCATIONS[3]],
  tempUnit: "C",
  windUnit: "kmh",
  rainUnit: "mm",
  clockFormat: "12h",
  preferredTheme: "cinematic",
  contentLanguage: "en",
  autoDetectLocation: true,
  refreshIntervalMinutes: 15,
  alertsEnabled: {
    heavyRain: true,
    thunderstorm: true,
    strongWind: true,
    heatwave: true,
    modelShift: true,
  },
};

const NAV_ITEMS: Array<{
  id: NavSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "forecast-30", label: "30-Day Forecast", icon: Calendar },
  { id: "forecast-week", label: "Weekly Forecast", icon: CalendarDays },
  { id: "forecast-hour", label: "Hourly Forecast", icon: Clock },
  { id: "models", label: "Model Comparison", icon: GitCompare },
  { id: "radar", label: "Live Radar", icon: Radio },
  { id: "maps", label: "Weather Maps", icon: Layers },
  { id: "analyst", label: "AI Weather Analyst", icon: Sparkles },
  { id: "studio", label: "Social Studio", icon: Video },
  { id: "settings", label: "Settings", icon: Settings },
];

export function SkycastApp() {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [activeNav, setActiveNav] = useState<NavSection>("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [location, setLocation] = useState<GeoLocation>(PRESET_LOCATIONS[0]);
  const [detectingGeo, setDetectingGeo] = useState(false);
  const [payload, setPayload] = useState<WeatherIntelligencePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load persisted settings from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<UserSettings>;
        const merged = { ...DEFAULT_SETTINGS, ...parsed };
        setSettings(merged);
        if (merged.defaultLocation) {
          setLocation(merged.defaultLocation);
        }
      }
    } catch {
      // Ignore storage errors
    } finally {
      setSettingsLoaded(true);
    }
  }, []);

  const updateSettings = useCallback((next: UserSettings) => {
    setSettings(next);
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage errors
    }
  }, []);

  // Fetch real live weather intelligence for selected location
  const fetchWeather = useCallback(async (loc: GeoLocation) => {
    setLoading(true);
    setError(null);
    try {
      const json = await apiFetchWeather(loc);
      setPayload(json);
      if (json.location?.timezone && json.location.timezone !== loc.timezone) {
        setLocation((prev) =>
          Math.abs(prev.latitude - loc.latitude) < 0.01 &&
          Math.abs(prev.longitude - loc.longitude) < 0.01
            ? { ...prev, timezone: json.location.timezone }
            : prev
        );
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to connect to live meteorological model providers."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // Trigger weather fetch when location changes
  useEffect(() => {
    if (!settingsLoaded) return;
    fetchWeather(location);
  }, [location.latitude, location.longitude, settingsLoaded, fetchWeather]);

  // Automatic geolocation detection
  const detectUserLocation = useCallback(() => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) return;
    setDetectingGeo(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const detected = await apiReverseGeocode(latitude, longitude);
          if (detected) {
            setLocation(detected);
          }
        } catch {
          // Keep current location if reverse geocode fails
        } finally {
          setDetectingGeo(false);
        }
      },
      () => {
        setDetectingGeo(false);
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
    );
  }, []);

  // Auto-detect on first visit if enabled
  useEffect(() => {
    if (!settingsLoaded || !settings.autoDetectLocation) return;
    const promptedKey = "vaanam_geo_attempted_session";
    if (!sessionStorage.getItem(promptedKey)) {
      sessionStorage.setItem(promptedKey, "1");
      detectUserLocation();
    }
  }, [settingsLoaded, settings.autoDetectLocation, detectUserLocation]);

  // Periodic background refresh
  useEffect(() => {
    if (!settings.refreshIntervalMinutes) return;
    const ms = settings.refreshIntervalMinutes * 60 * 1000;
    const id = setInterval(() => fetchWeather(location), ms);
    return () => clearInterval(id);
  }, [settings.refreshIntervalMinutes, location, fetchWeather]);

  const handleToggleFavourite = (loc: GeoLocation) => {
    const exists = settings.favourites.some(
      (f) =>
        Math.abs(f.latitude - loc.latitude) < 0.02 &&
        Math.abs(f.longitude - loc.longitude) < 0.02
    );
    const nextFavs = exists
      ? settings.favourites.filter(
          (f) =>
            !(
              Math.abs(f.latitude - loc.latitude) < 0.02 &&
              Math.abs(f.longitude - loc.longitude) < 0.02
            )
        )
      : [{ ...loc, source: "favourite" as const }, ...settings.favourites];
    updateSettings({ ...settings, favourites: nextFavs });
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Desktop Left Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 shrink-0 border-r border-cyan-500/15 bg-[#040a18]/90 backdrop-blur-xl sticky top-0 h-screen">
        <div className="p-5 border-b border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/25">
              <CloudLightning className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <div className="text-base font-extrabold tracking-tight text-white leading-none">
                VAANAM <span className="text-cyan-400">AI</span>
              </div>
              <div className="text-[10px] font-medium text-slate-400 mt-0.5">
                Weather Intelligence Studio
              </div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeNav === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveNav(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                  active
                    ? "bg-cyan-500/20 text-cyan-100 border border-cyan-400/35 shadow-sm"
                    : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/50 border border-transparent"
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? "text-cyan-300" : "text-slate-500"}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800/80 text-[11px] text-slate-400 space-y-1">
          <div className="flex items-center justify-between">
            <span>Primary Model</span>
            <span className="text-emerald-400 font-semibold">ECMWF ENS 51</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Extended 16–30d</span>
            <span className="text-cyan-300 font-semibold">ECMWF SEAS5</span>
          </div>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-cyan-500/15 bg-[#040a18]/95 sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center">
            <CloudLightning className="w-4 h-4 text-slate-950" />
          </div>
          <span className="font-extrabold text-sm text-white">
            VAANAM <span className="text-cyan-400">AI</span>
          </span>
        </div>
        <button
          onClick={() => setMobileMenuOpen((o) => !o)}
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-200"
          aria-label="Toggle navigation"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-lg p-5 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <span className="font-extrabold text-lg text-white">
              VAANAM <span className="text-cyan-400">AI</span>
            </span>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 rounded-xl bg-slate-900 text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = activeNav === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveNav(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`flex items-center gap-2.5 p-3 rounded-xl text-xs font-semibold border ${
                    active
                      ? "bg-cyan-500/20 border-cyan-400/50 text-cyan-100"
                      : "bg-slate-900/70 border-slate-800 text-slate-300"
                  }`}
                >
                  <Icon className="w-4 h-4 text-cyan-400" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Workspace */}
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto w-full">
        {/* Global Location Bar */}
        <div className="mb-6">
          <LocationSearchBar
            currentLocation={location}
            favourites={settings.favourites}
            clockFormat={settings.clockFormat}
            detectingGeo={detectingGeo}
            onSelectLocation={(loc) => setLocation(loc)}
            onToggleFavourite={handleToggleFavourite}
            onDetectLocation={detectUserLocation}
          />
        </div>

        {/* Loading State */}
        {loading && !payload && (
          <div className="glass-card rounded-3xl p-14 flex flex-col items-center justify-center gap-3 text-center">
            <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
            <div className="text-base font-semibold text-white">
              Retrieving Live Weather Models for {location.name}...
            </div>
            <p className="text-xs text-slate-400 max-w-md">
              Connecting to ECMWF IFS 0.25°, ECMWF ENS (51-member ensemble), ECMWF SEAS5 (Days
              16–30), NOAA HREF coverage check, and WeatherNext 3 adapter.
            </p>
          </div>
        )}

        {/* Error State (Never substitutes fake readings) */}
        {error && !loading && (
          <div className="rounded-3xl bg-rose-950/30 border border-rose-500/40 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <h2 className="text-base font-bold text-rose-200">
                  Live Weather Data Temporarily Unavailable
                </h2>
                <p className="text-xs text-slate-300 mt-1">{error}</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  VAANAM AI never substitutes fabricated weather readings when upstream models fail.
                </p>
              </div>
            </div>
            <button
              onClick={() => fetchWeather(location)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500/20 border border-rose-400/40 text-rose-100 text-xs font-semibold shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Retry Live Fetch
            </button>
          </div>
        )}

        {/* Active Module Content */}
        {payload && (
          <div className="relative">
            {loading && (
              <div className="mb-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/15 border border-cyan-400/30 text-xs text-cyan-200">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Syncing live model data for{" "}
                {location.name}...
              </div>
            )}

            {activeNav === "dashboard" && (
              <DashboardView
                payload={payload}
                settings={settings}
                onNavigate={setActiveNav}
              />
            )}
            {activeNav === "forecast-30" && (
              <Forecast30DayView
                key="30days"
                payload={payload}
                settings={settings}
                initialTab="30days"
              />
            )}
            {activeNav === "forecast-week" && (
              <Forecast30DayView
                key="week"
                payload={payload}
                settings={settings}
                initialTab="week"
              />
            )}
            {activeNav === "forecast-hour" && (
              <Forecast30DayView
                key="hour"
                payload={payload}
                settings={settings}
                initialTab="hour"
              />
            )}
            {activeNav === "models" && (
              <ModelComparisonView payload={payload} settings={settings} />
            )}
            {activeNav === "radar" && (
              <LiveRadarView payload={payload} settings={settings} />
            )}
            {activeNav === "maps" && (
              <WeatherMapsView payload={payload} settings={settings} />
            )}
            {activeNav === "analyst" && (
              <AiAnalystView
                payload={payload}
                defaultLanguage={settings.contentLanguage}
              />
            )}
            {activeNav === "studio" && (
              <SocialStudioView payload={payload} settings={settings} />
            )}
            {activeNav === "settings" && (
              <SettingsView
                settings={settings}
                currentLocation={location}
                onUpdateSettings={updateSettings}
                onSelectLocation={(loc) => {
                  setLocation(loc);
                  setActiveNav("dashboard");
                }}
              />
            )}
          </div>
        )}

        {/* Mandatory Data Quality & Disclaimer Footer */}
        <DataQualityFooter payload={payload} />
      </main>
    </div>
  );
}
