"use client";

import React from "react";
import { Bell, Globe, Settings, Sliders, Star, Trash2 } from "lucide-react";
import { STORY_THEMES } from "@/lib/studio/themes";
import { GeoLocation, StoryThemeId, UserSettings } from "@/types/weather";

interface Props {
  settings: UserSettings;
  currentLocation: GeoLocation;
  onUpdateSettings: (next: UserSettings) => void;
  onSelectLocation: (loc: GeoLocation) => void;
}

export function SettingsView({
  settings,
  currentLocation,
  onUpdateSettings,
  onSelectLocation,
}: Props) {
  const update = <K extends keyof UserSettings>(key: K, val: UserSettings[K]) => {
    onUpdateSettings({ ...settings, [key]: val });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Settings className="w-6 h-6 text-cyan-400" />
          Settings &amp; Personalisation
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Preferences are persisted locally in your browser and apply across all charts, forecasts, and Social Studio exports
        </p>
      </div>

      {/* Units & Clock */}
      <div className="glass-card rounded-2xl p-5 space-y-4">
        <h2 className="text-sm font-bold text-cyan-300 flex items-center gap-2">
          <Sliders className="w-4 h-4" /> Measurement Units &amp; Clock
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs text-slate-400 font-medium">Temperature</label>
            <div className="grid grid-cols-2 gap-1.5">
              {(["C", "F"] as const).map((u) => (
                <button
                  key={u}
                  onClick={() => update("tempUnit", u)}
                  className={`py-2 rounded-xl text-xs font-bold border ${
                    settings.tempUnit === u
                      ? "bg-cyan-500/20 border-cyan-400/50 text-cyan-100"
                      : "bg-slate-900 border-slate-800 text-slate-400"
                  }`}
                >
                  °{u}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-slate-400 font-medium">Wind Speed</label>
            <div className="grid grid-cols-2 gap-1.5">
              {(
                [
                  { id: "kmh", label: "km/h" },
                  { id: "ms", label: "m/s" },
                ] as const
              ).map((u) => (
                <button
                  key={u.id}
                  onClick={() => update("windUnit", u.id)}
                  className={`py-2 rounded-xl text-xs font-bold border ${
                    settings.windUnit === u.id
                      ? "bg-cyan-500/20 border-cyan-400/50 text-cyan-100"
                      : "bg-slate-900 border-slate-800 text-slate-400"
                  }`}
                >
                  {u.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-slate-400 font-medium">Rainfall</label>
            <div className="grid grid-cols-2 gap-1.5">
              {(
                [
                  { id: "mm", label: "mm" },
                  { id: "in", label: "inches" },
                ] as const
              ).map((u) => (
                <button
                  key={u.id}
                  onClick={() => update("rainUnit", u.id)}
                  className={`py-2 rounded-xl text-xs font-bold border ${
                    settings.rainUnit === u.id
                      ? "bg-cyan-500/20 border-cyan-400/50 text-cyan-100"
                      : "bg-slate-900 border-slate-800 text-slate-400"
                  }`}
                >
                  {u.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-slate-400 font-medium">Clock Format</label>
            <div className="grid grid-cols-2 gap-1.5">
              {(["12h", "24h"] as const).map((u) => (
                <button
                  key={u}
                  onClick={() => update("clockFormat", u)}
                  className={`py-2 rounded-xl text-xs font-bold border ${
                    settings.clockFormat === u
                      ? "bg-cyan-500/20 border-cyan-400/50 text-cyan-100"
                      : "bg-slate-900 border-slate-800 text-slate-400"
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Language, Theme & Refresh */}
      <div className="glass-card rounded-2xl p-5 space-y-4">
        <h2 className="text-sm font-bold text-cyan-300 flex items-center gap-2">
          <Globe className="w-4 h-4" /> Social Language, Theme &amp; Location
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs text-slate-400 font-medium">
              Default Social &amp; AI Analyst Language
            </label>
            <select
              value={settings.contentLanguage}
              onChange={(e) => update("contentLanguage", e.target.value as UserSettings["contentLanguage"])}
              className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2.5 text-xs text-slate-100"
            >
              <option value="en">English</option>
              <option value="ta">Tamil (தமிழ்)</option>
              <option value="bilingual">Bilingual (Tamil + English)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-slate-400 font-medium">
              Preferred Social Studio Theme
            </label>
            <select
              value={settings.preferredTheme}
              onChange={(e) => update("preferredTheme", e.target.value as StoryThemeId)}
              className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2.5 text-xs text-slate-100"
            >
              {STORY_THEMES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-slate-400 font-medium">
              Auto-Refresh Interval (minutes)
            </label>
            <select
              value={settings.refreshIntervalMinutes}
              onChange={(e) => update("refreshIntervalMinutes", Number(e.target.value))}
              className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2.5 text-xs text-slate-100"
            >
              <option value={10}>Every 10 minutes</option>
              <option value={15}>Every 15 minutes</option>
              <option value={30}>Every 30 minutes</option>
              <option value={60}>Every 60 minutes</option>
            </select>
          </div>

          <div className="flex items-center justify-between rounded-xl bg-slate-950/60 border border-slate-800 px-4 py-3">
            <div>
              <div className="text-xs font-semibold text-slate-100">Auto-Detect GPS Location</div>
              <div className="text-[11px] text-slate-400">Request browser geolocation on startup</div>
            </div>
            <input
              type="checkbox"
              checked={settings.autoDetectLocation}
              onChange={(e) => update("autoDetectLocation", e.target.checked)}
              className="w-4 h-4 accent-cyan-400"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800">
          <div className="text-xs text-slate-300">
            Default startup location:{" "}
            <strong className="text-cyan-300">
              {settings.defaultLocation?.name || "Chennai (System Default)"}
            </strong>
          </div>
          <button
            onClick={() => update("defaultLocation", currentLocation)}
            className="px-3 py-1.5 rounded-xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-100 text-xs font-semibold"
          >
            Set {currentLocation.name} as Default
          </button>
        </div>
      </div>

      {/* Weather Alert Preferences */}
      <div className="glass-card rounded-2xl p-5 space-y-3">
        <h2 className="text-sm font-bold text-cyan-300 flex items-center gap-2">
          <Bell className="w-4 h-4" /> Weather Intelligence Alert Preferences
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {(
            [
              { key: "heavyRain", label: "Heavy Rainfall Potential" },
              { key: "thunderstorm", label: "Thunderstorm Activity" },
              { key: "strongWind", label: "Strong Wind Advisories" },
              { key: "heatwave", label: "Heatwave Stress" },
              { key: "modelShift", label: "Significant Model Divergence" },
            ] as const
          ).map((item) => (
            <label
              key={item.key}
              className="flex items-center justify-between rounded-xl bg-slate-950/60 border border-slate-800 px-3.5 py-2.5 text-xs text-slate-200 cursor-pointer"
            >
              <span>{item.label}</span>
              <input
                type="checkbox"
                checked={settings.alertsEnabled[item.key]}
                onChange={(e) =>
                  update("alertsEnabled", {
                    ...settings.alertsEnabled,
                    [item.key]: e.target.checked,
                  })
                }
                className="w-4 h-4 accent-cyan-400"
              />
            </label>
          ))}
        </div>
      </div>

      {/* Saved Favourites */}
      <div className="glass-card rounded-2xl p-5 space-y-3">
        <h2 className="text-sm font-bold text-amber-300 flex items-center gap-2">
          <Star className="w-4 h-4 fill-amber-400" /> Saved Favourite Cities ({settings.favourites.length})
        </h2>
        {settings.favourites.length === 0 ? (
          <p className="text-xs text-slate-400">
            No favourite locations saved yet. Click &ldquo;Save&rdquo; in the top search bar to bookmark cities.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {settings.favourites.map((fav) => (
              <div
                key={fav.id}
                className="flex items-center justify-between rounded-xl bg-slate-950/60 border border-slate-800 px-3.5 py-2.5"
              >
                <button
                  onClick={() => onSelectLocation(fav)}
                  className="text-left min-w-0 flex-1"
                >
                  <div className="text-xs font-semibold text-white truncate">{fav.name}</div>
                  <div className="text-[11px] text-slate-400 truncate">
                    {[fav.state, fav.country].filter(Boolean).join(", ")}
                  </div>
                </button>
                <button
                  onClick={() =>
                    update(
                      "favourites",
                      settings.favourites.filter((f) => f.id !== fav.id)
                    )
                  }
                  className="text-slate-500 hover:text-rose-400 p-1"
                  title="Remove favourite"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
