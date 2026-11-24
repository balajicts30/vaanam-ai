import { ClockFormat, RainfallUnit, TemperatureUnit, WindUnit } from "@/types/weather";

export function formatTemp(valC: number | null | undefined, unit: TemperatureUnit, decimals = 0): string {
  if (valC === null || valC === undefined || Number.isNaN(valC)) return "—";
  const converted = unit === "F" ? (valC * 9) / 5 + 32 : valC;
  return `${converted.toFixed(decimals)}°${unit}`;
}

export function convertTemp(valC: number | null | undefined, unit: TemperatureUnit): number | null {
  if (valC === null || valC === undefined || Number.isNaN(valC)) return null;
  return unit === "F" ? Number(((valC * 9) / 5 + 32).toFixed(1)) : Number(valC.toFixed(1));
}

export function formatWind(valKmh: number | null | undefined, unit: WindUnit): string {
  if (valKmh === null || valKmh === undefined || Number.isNaN(valKmh)) return "—";
  if (unit === "ms") {
    return `${(valKmh / 3.6).toFixed(1)} m/s`;
  }
  return `${Math.round(valKmh)} km/h`;
}

export function convertWind(valKmh: number | null | undefined, unit: WindUnit): number | null {
  if (valKmh === null || valKmh === undefined || Number.isNaN(valKmh)) return null;
  return unit === "ms" ? Number((valKmh / 3.6).toFixed(1)) : Number(valKmh.toFixed(1));
}

export function formatRain(valMm: number | null | undefined, unit: RainfallUnit): string {
  if (valMm === null || valMm === undefined || Number.isNaN(valMm)) return "—";
  if (unit === "in") {
    return `${(valMm / 25.4).toFixed(2)} in`;
  }
  return `${valMm.toFixed(1)} mm`;
}

export function windDirectionToCompass(deg: number | null | undefined): string {
  if (deg === null || deg === undefined || Number.isNaN(deg)) return "—";
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  const idx = Math.round((((deg % 360) + 360) % 360) / 22.5) % 16;
  return dirs[idx];
}

export function formatHourLabel(isoOrLocalTime: string, clockFormat: ClockFormat): string {
  // Open-Meteo returns YYYY-MM-DDTHH:MM in local timezone
  const timePart = isoOrLocalTime.includes("T") ? isoOrLocalTime.split("T")[1] : isoOrLocalTime;
  const [hhStr, mmStr = "00"] = timePart.split(":");
  const hh = parseInt(hhStr, 10);
  if (Number.isNaN(hh)) return isoOrLocalTime;
  if (clockFormat === "24h") {
    return `${String(hh).padStart(2, "0")}:${mmStr.slice(0, 2)}`;
  }
  const suffix = hh >= 12 ? "PM" : "AM";
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${h12} ${suffix}`;
}

export function formatLocalNow(timezone: string, clockFormat: ClockFormat): { dateStr: string; timeStr: string } {
  try {
    const now = new Date();
    const dateStr = new Intl.DateTimeFormat("en-IN", {
      timeZone: timezone,
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(now);
    const timeStr = new Intl.DateTimeFormat("en-IN", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: clockFormat === "12h",
    }).format(now);
    return { dateStr, timeStr };
  } catch {
    const now = new Date();
    return {
      dateStr: now.toDateString(),
      timeStr: now.toTimeString().slice(0, 5),
    };
  }
}

export function formatDateShort(dateIso: string): { weekday: string; dayMonth: string } {
  const [y, m, d] = dateIso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, (m || 1) - 1, d || 1));
  const weekday = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "UTC" }).format(dt);
  const dayMonth = new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short", timeZone: "UTC" }).format(dt);
  return { weekday, dayMonth };
}
