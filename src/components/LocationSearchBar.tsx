"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Compass,
  Clock,
  Heart,
  Loader2,
  MapPin,
  Search,
  Star,
  X,
} from "lucide-react";
import { PRESET_LOCATIONS } from "@/lib/location";
import { apiSearchLocations } from "@/lib/client-api";
import { formatLocalNow } from "@/lib/units";
import { ClockFormat, GeoLocation } from "@/types/weather";

interface Props {
  currentLocation: GeoLocation;
  favourites: GeoLocation[];
  clockFormat: ClockFormat;
  detectingGeo: boolean;
  onSelectLocation: (loc: GeoLocation) => void;
  onToggleFavourite: (loc: GeoLocation) => void;
  onDetectLocation: () => void;
}

export function LocationSearchBar({
  currentLocation,
  favourites,
  clockFormat,
  detectingGeo,
  onSelectLocation,
  onToggleFavourite,
  onDetectLocation,
}: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeoLocation[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const [localClock, setLocalClock] = useState(() =>
    formatLocalNow(currentLocation.timezone || "Asia/Kolkata", clockFormat)
  );
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const update = () =>
      setLocalClock(formatLocalNow(currentLocation.timezone || "Asia/Kolkata", clockFormat));
    update();
    const timer = setInterval(update, 30000);
    return () => clearInterval(timer);
  }, [currentLocation.timezone, clockFormat]);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      return;
    }
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const list = await apiSearchLocations(trimmed);
        if (!ctrl.signal.aborted) setResults(list);
      } catch {
        // Ignore abort
      } finally {
        setSearching(false);
      }
    }, 320);

    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [query]);

  const isFav = favourites.some(
    (f) =>
      Math.abs(f.latitude - currentLocation.latitude) < 0.02 &&
      Math.abs(f.longitude - currentLocation.longitude) < 0.02
  );

  return (
    <div className="space-y-3" ref={containerRef}>
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <div className="flex items-center gap-2 rounded-2xl bg-slate-900/80 border border-cyan-500/25 px-3.5 py-2.5 focus-within:border-cyan-400/70 focus-within:ring-2 focus-within:ring-cyan-500/20 transition">
            <Search className="w-4 h-4 text-cyan-400 shrink-0" />
            <input
              type="text"
              value={query}
              onFocus={() => setOpen(true)}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
              }}
              placeholder="Search city, town, village, postal code, landmark, or lat,lon (e.g. Chennai, Tambaram, 13.08,80.27)..."
              className="w-full bg-transparent text-sm text-slate-100 placeholder:text-slate-400 focus:outline-none"
            />
            {searching && <Loader2 className="w-4 h-4 text-cyan-400 animate-spin shrink-0" />}
            {query && !searching && (
              <button
                onClick={() => {
                  setQuery("");
                  setResults([]);
                }}
                className="text-slate-400 hover:text-slate-200"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Search Dropdown */}
          {open && (query.trim().length >= 2 || favourites.length > 0) && (
            <div className="absolute z-50 mt-2 w-full rounded-2xl bg-[#071124]/95 border border-cyan-500/25 shadow-2xl backdrop-blur-xl overflow-hidden max-h-96 overflow-y-auto">
              {results.length > 0 && (
                <div className="p-2">
                  <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-cyan-400">
                    Global Search Results
                  </div>
                  {results.map((loc) => (
                    <button
                      key={loc.id}
                      onClick={() => {
                        onSelectLocation(loc);
                        setQuery("");
                        setOpen(false);
                      }}
                      className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl hover:bg-cyan-500/10 text-left transition"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-slate-100 truncate">
                          {loc.name}
                        </div>
                        <div className="text-xs text-slate-400 truncate">
                          {[loc.district, loc.state, loc.country].filter(Boolean).join(", ")}
                        </div>
                      </div>
                      <span className="text-[11px] font-mono text-slate-500 shrink-0">
                        {loc.latitude.toFixed(2)}, {loc.longitude.toFixed(2)}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {query.trim().length >= 2 && !searching && results.length === 0 && (
                <div className="px-4 py-4 text-xs text-slate-400">
                  No locations found for &ldquo;{query}&rdquo;. Try a city name, postal code, or coordinates (e.g. 13.08, 80.27).
                </div>
              )}

              {favourites.length > 0 && (
                <div className="p-2 border-t border-slate-800/80">
                  <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <Star className="w-3 h-3 fill-amber-400" /> Saved Favourites
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                    {favourites.map((fav) => (
                      <button
                        key={fav.id}
                        onClick={() => {
                          onSelectLocation(fav);
                          setOpen(false);
                        }}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-800/70 text-left text-xs text-slate-200"
                      >
                        <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="truncate">
                          {fav.name}
                          {fav.state ? `, ${fav.state}` : ""}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions: Detect GPS, Favourite, Local Time */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onDetectLocation}
            disabled={detectingGeo}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/30 text-cyan-200 text-xs font-medium transition disabled:opacity-60"
            title="Detect my current location via GPS"
          >
            {detectingGeo ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Compass className="w-3.5 h-3.5" />
            )}
            <span>Locate Me</span>
          </button>

          <button
            onClick={() => onToggleFavourite(currentLocation)}
            className={`inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-xs font-medium transition ${
              isFav
                ? "bg-amber-500/20 border-amber-400/40 text-amber-200"
                : "bg-slate-900/70 border-slate-700/70 text-slate-300 hover:border-cyan-400/40"
            }`}
            title={isFav ? "Remove from favourites" : "Save to favourites"}
          >
            <Heart className={`w-3.5 h-3.5 ${isFav ? "fill-amber-400 text-amber-400" : ""}`} />
            <span className="hidden sm:inline">{isFav ? "Saved" : "Save"}</span>
          </button>

          <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900/70 border border-slate-800 text-xs text-slate-300">
            <Clock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="font-medium text-slate-100">{localClock.timeStr}</span>
            <span className="text-slate-400 hidden sm:inline">• {localClock.dateStr}</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300">
              {currentLocation.timezone}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Tamil Nadu, India & Favourite Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mr-1 shrink-0">
          Quick Switch:
        </span>
        {PRESET_LOCATIONS.map((preset) => {
          const active =
            Math.abs(preset.latitude - currentLocation.latitude) < 0.05 &&
            Math.abs(preset.longitude - currentLocation.longitude) < 0.05;
          return (
            <button
              key={preset.id}
              onClick={() => onSelectLocation(preset)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition border ${
                active
                  ? "bg-cyan-500/25 border-cyan-400/60 text-cyan-100"
                  : "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
              }`}
            >
              {preset.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
