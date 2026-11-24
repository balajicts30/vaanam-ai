import { NextRequest, NextResponse } from "next/server";
import { serverCache } from "@/lib/cache";

export interface WeatherGridNode {
  lat: number;
  lon: number;
  temperature: number | null;
  precipitation: number | null;
  cloudCover: number | null;
  windSpeed: number | null;
  windDirection: number | null;
  pressure: number | null;
}

/**
 * Fetches a real 3×3 regional spatial grid around the selected location via Open-Meteo
 * so the Interactive Weather Map renders genuine temperature, rainfall, cloud cover, wind, and pressure layers.
 */
export async function GET(req: NextRequest) {
  const lat = parseFloat(req.nextUrl.searchParams.get("lat") || "");
  const lon = parseFloat(req.nextUrl.searchParams.get("lon") || "");

  if (Number.isNaN(lat) || Number.isNaN(lon)) {
    return NextResponse.json({ error: "Invalid lat/lon" }, { status: 400 });
  }

  const cacheKey = `grid:${lat.toFixed(1)},${lon.toFixed(1)}`;
  const cached = serverCache.get<{ nodes: WeatherGridNode[]; retrievedAt: string }>(cacheKey);
  if (cached) return NextResponse.json(cached);

  const offsets = [-1.2, 0, 1.2];
  const lats: string[] = [];
  const lons: string[] = [];
  for (const dLat of offsets) {
    for (const dLon of offsets) {
      const nLat = Math.max(-85, Math.min(85, lat + dLat));
      const nLon = ((lon + dLon + 180) % 360) - 180;
      lats.push(nLat.toFixed(3));
      lons.push(nLon.toFixed(3));
    }
  }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats.join(
      ","
    )}&longitude=${lons.join(
      ","
    )}&current=temperature_2m,precipitation,cloud_cover,wind_speed_10m,wind_direction_10m,pressure_msl`;

    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error(`Grid API HTTP ${res.status}`);
    const json = await res.json();
    const list = Array.isArray(json) ? json : [json];

    const nodes: WeatherGridNode[] = list.map((item: any, idx: number) => ({
      lat: Number(lats[idx] ?? item.latitude),
      lon: Number(lons[idx] ?? item.longitude),
      temperature: item.current?.temperature_2m ?? null,
      precipitation: item.current?.precipitation ?? null,
      cloudCover: item.current?.cloud_cover ?? null,
      windSpeed: item.current?.wind_speed_10m ?? null,
      windDirection: item.current?.wind_direction_10m ?? null,
      pressure: item.current?.pressure_msl ?? null,
    }));

    const result = { nodes, retrievedAt: new Date().toISOString() };
    serverCache.set(cacheKey, result, 600);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load spatial weather grid", nodes: [] },
      { status: 502 }
    );
  }
}
