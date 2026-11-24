import { parseCoordinateQuery } from "@/lib/location";
import { getWeatherIntelligence } from "@/lib/models/aggregator";
import { generateAiWeatherReport } from "@/lib/models/ai-analyst";
import {
  AiAnalystReport,
  ContentLanguage,
  GeoLocation,
  RainViewerPayload,
  WeatherGridNode,
  WeatherIntelligencePayload,
} from "@/types/weather";

export const IS_STATIC_PAGES = process.env.NEXT_PUBLIC_STATIC_EXPORT === "true";

export async function apiSearchLocations(q: string): Promise<GeoLocation[]> {
  if (!IS_STATIC_PAGES) {
    const res = await fetch(`/api/location/search?q=${encodeURIComponent(q)}`);
    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json.results) ? json.results : [];
  }

  const coords = parseCoordinateQuery(q);
  if (coords) {
    return [
      {
        id: `coord-${coords.lat.toFixed(4)}-${coords.lon.toFixed(4)}`,
        name: `${coords.lat.toFixed(4)}, ${coords.lon.toFixed(4)}`,
        country: "Coordinates",
        latitude: coords.lat,
        longitude: coords.lon,
        timezone: "auto",
        source: "coordinates",
      },
    ];
  }

  const res = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      q
    )}&count=10&language=en&format=json`
  );
  if (!res.ok) return [];
  const json = await res.json();
  if (!Array.isArray(json.results)) return [];

  return json.results.map((item: any) => ({
    id: `om-${item.id}`,
    name: item.name,
    district: item.admin2 || undefined,
    state: item.admin1 || undefined,
    country: item.country || "",
    countryCode: item.country_code || undefined,
    latitude: Number(item.latitude),
    longitude: Number(item.longitude),
    timezone: item.timezone || "auto",
    elevation: typeof item.elevation === "number" ? item.elevation : undefined,
    source: "search" as const,
  }));
}

export async function apiReverseGeocode(lat: number, lon: number): Promise<GeoLocation | null> {
  if (!IS_STATIC_PAGES) {
    const res = await fetch(`/api/location/reverse?lat=${lat.toFixed(5)}&lon=${lon.toFixed(5)}`);
    if (!res.ok) return null;
    const json = await res.json();
    return json.location || null;
  }

  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
    );
    if (res.ok) {
      const json = await res.json();
      return {
        id: `geo-${lat.toFixed(3)}-${lon.toFixed(3)}`,
        name: json.city || json.locality || json.principalSubdivision || "Detected Location",
        district: json.locality || undefined,
        state: json.principalSubdivision || undefined,
        country: json.countryName || "",
        countryCode: json.countryCode || undefined,
        latitude: lat,
        longitude: lon,
        timezone: "auto",
        source: "geolocation",
      };
    }
  } catch {
    // Fallback to coordinates
  }
  return {
    id: `geo-${lat.toFixed(3)}-${lon.toFixed(3)}`,
    name: `${lat.toFixed(3)}, ${lon.toFixed(3)}`,
    country: "Detected Coordinates",
    latitude: lat,
    longitude: lon,
    timezone: "auto",
    source: "geolocation",
  };
}

export async function apiFetchWeather(loc: GeoLocation): Promise<WeatherIntelligencePayload> {
  if (!IS_STATIC_PAGES) {
    const sp = new URLSearchParams({
      lat: String(loc.latitude),
      lon: String(loc.longitude),
      name: loc.name,
      country: loc.country || "",
      timezone: loc.timezone || "auto",
    });
    if (loc.id) sp.set("id", loc.id);
    if (loc.district) sp.set("district", loc.district);
    if (loc.state) sp.set("state", loc.state);
    if (loc.countryCode) sp.set("countryCode", loc.countryCode);

    const res = await fetch(`/api/weather?${sp.toString()}`);
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error || `Weather API HTTP ${res.status}`);
    }
    return json;
  }

  // Static GitHub Pages mode: fetch live directly from CORS-enabled ECMWF/Open-Meteo endpoints
  return getWeatherIntelligence(loc);
}

export async function apiFetchWeatherGrid(lat: number, lon: number): Promise<WeatherGridNode[]> {
  if (!IS_STATIC_PAGES) {
    const res = await fetch(`/api/weather/grid?lat=${lat}&lon=${lon}`);
    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json.nodes) ? json.nodes : [];
  }

  const offsets = [-1.2, 0, 1.2];
  const lats: string[] = [];
  const lons: string[] = [];
  for (const dLat of offsets) {
    for (const dLon of offsets) {
      lats.push(Math.max(-85, Math.min(85, lat + dLat)).toFixed(3));
      lons.push((((lon + dLon + 180) % 360) - 180).toFixed(3));
    }
  }
  const res = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lats.join(",")}&longitude=${lons.join(
      ","
    )}&current=temperature_2m,precipitation,cloud_cover,wind_speed_10m,wind_direction_10m,pressure_msl`
  );
  if (!res.ok) return [];
  const json = await res.json();
  const list = Array.isArray(json) ? json : [json];
  return list.map((item: any, idx: number) => ({
    lat: Number(lats[idx] ?? item.latitude),
    lon: Number(lons[idx] ?? item.longitude),
    temperature: item.current?.temperature_2m ?? null,
    precipitation: item.current?.precipitation ?? null,
    cloudCover: item.current?.cloud_cover ?? null,
    windSpeed: item.current?.wind_speed_10m ?? null,
    windDirection: item.current?.wind_direction_10m ?? null,
    pressure: item.current?.pressure_msl ?? null,
  }));
}

export async function apiFetchRadar(): Promise<RainViewerPayload> {
  if (!IS_STATIC_PAGES) {
    const res = await fetch("/api/radar");
    if (!res.ok) throw new Error(`Radar API HTTP ${res.status}`);
    return res.json();
  }

  const res = await fetch("https://api.rainviewer.com/public/weather-maps.json");
  if (!res.ok) throw new Error(`RainViewer API HTTP ${res.status}`);
  const json = await res.json();
  return {
    host: json.host || "https://tilecache.rainviewer.com",
    generated: json.generated || Math.floor(Date.now() / 1000),
    radarPast: Array.isArray(json.radar?.past) ? json.radar.past : [],
    radarNowcast: Array.isArray(json.radar?.nowcast) ? json.radar.nowcast : [],
    satelliteInfrared: Array.isArray(json.satellite?.infrared) ? json.satellite.infrared : [],
    retrievedAt: new Date().toISOString(),
  };
}

export async function apiFetchMapConfig(): Promise<{
  openWeatherEnabled: boolean;
  mapboxEnabled: boolean;
  maptilerEnabled: boolean;
}> {
  if (IS_STATIC_PAGES) {
    return { openWeatherEnabled: false, mapboxEnabled: false, maptilerEnabled: false };
  }
  const res = await fetch("/api/map/config");
  if (!res.ok) return { openWeatherEnabled: false, mapboxEnabled: false, maptilerEnabled: false };
  return res.json();
}

export async function apiGenerateAnalyst(
  payload: WeatherIntelligencePayload,
  language: ContentLanguage
): Promise<AiAnalystReport> {
  if (!IS_STATIC_PAGES) {
    const res = await fetch("/api/analyst", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payload, language }),
    });
    if (!res.ok) throw new Error(`Analyst API HTTP ${res.status}`);
    return res.json();
  }

  return generateAiWeatherReport(payload, language);
}
