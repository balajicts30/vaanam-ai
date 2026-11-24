import { NextRequest, NextResponse } from "next/server";
import { parseCoordinateQuery } from "@/lib/location";
import { GeoLocation } from "@/types/weather";

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") || "").trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  // 1. Direct latitude, longitude coordinate search
  const coords = parseCoordinateQuery(q);
  if (coords) {
    const loc: GeoLocation = {
      id: `coord-${coords.lat.toFixed(4)}-${coords.lon.toFixed(4)}`,
      name: `${coords.lat.toFixed(4)}, ${coords.lon.toFixed(4)}`,
      country: "Coordinates",
      latitude: coords.lat,
      longitude: coords.lon,
      timezone: "auto",
      source: "coordinates",
    };
    return NextResponse.json({ results: [loc] });
  }

  // 2. Query Open-Meteo Geocoding + OpenStreetMap Nominatim in parallel for global towns, villages, postal codes & landmarks
  const [omSettled, nomSettled] = await Promise.allSettled([
    fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
        q
      )}&count=8&language=en&format=json`,
      { signal: AbortSignal.timeout(7000) }
    ).then((r) => (r.ok ? r.json() : null)),
    fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
        q
      )}&format=json&addressdetails=1&limit=6`,
      {
        headers: { "User-Agent": "VAANAM-AI-WeatherPortal/1.0" },
        signal: AbortSignal.timeout(7000),
      }
    ).then((r) => (r.ok ? r.json() : null)),
  ]);

  const results: GeoLocation[] = [];
  const seen = new Set<string>();

  if (omSettled.status === "fulfilled" && Array.isArray(omSettled.value?.results)) {
    for (const item of omSettled.value.results) {
      const key = `${Number(item.latitude).toFixed(2)},${Number(item.longitude).toFixed(2)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      results.push({
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
        source: "search",
      });
    }
  }

  if (nomSettled.status === "fulfilled" && Array.isArray(nomSettled.value)) {
    for (const item of nomSettled.value) {
      const lat = parseFloat(item.lat);
      const lon = parseFloat(item.lon);
      if (Number.isNaN(lat) || Number.isNaN(lon)) continue;
      const key = `${lat.toFixed(2)},${lon.toFixed(2)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const addr = item.address || {};
      const name =
        addr.city ||
        addr.town ||
        addr.village ||
        addr.suburb ||
        addr.county ||
        item.name ||
        (item.display_name || "").split(",")[0];
      results.push({
        id: `nom-${item.place_id}`,
        name: String(name || q),
        district: addr.state_district || addr.county || undefined,
        state: addr.state || undefined,
        country: addr.country || "",
        countryCode: addr.country_code ? String(addr.country_code).toUpperCase() : undefined,
        latitude: lat,
        longitude: lon,
        timezone: "auto",
        postalCode: addr.postcode || undefined,
        source: "search",
      });
    }
  }

  return NextResponse.json({ results: results.slice(0, 10) });
}
