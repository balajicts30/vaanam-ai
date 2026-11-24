import { NextResponse } from "next/server";
import { serverCache } from "@/lib/cache";

export interface RainViewerPayload {
  host: string;
  generated: number;
  radarPast: Array<{ time: number; path: string }>;
  radarNowcast: Array<{ time: number; path: string }>;
  satelliteInfrared: Array<{ time: number; path: string }>;
  retrievedAt: string;
}

/**
 * Fetches live RainViewer global precipitation radar & infrared satellite frames.
 * Strictly separates observed past radar frames from short-range nowcast frames.
 */
export async function GET() {
  const cacheKey = "rainviewer:maps";
  const cached = serverCache.get<RainViewerPayload>(cacheKey);
  if (cached) return NextResponse.json(cached);

  try {
    const res = await fetch("https://api.rainviewer.com/public/weather-maps.json", {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`RainViewer API HTTP ${res.status}`);
    const json = await res.json();

    const payload: RainViewerPayload = {
      host: json.host || "https://tilecache.rainviewer.com",
      generated: json.generated || Math.floor(Date.now() / 1000),
      radarPast: Array.isArray(json.radar?.past) ? json.radar.past : [],
      radarNowcast: Array.isArray(json.radar?.nowcast) ? json.radar.nowcast : [],
      satelliteInfrared: Array.isArray(json.satellite?.infrared)
        ? json.satellite.infrared
        : [],
      retrievedAt: new Date().toISOString(),
    };

    serverCache.set(cacheKey, payload, 180); // 3-minute cache for live radar
    return NextResponse.json(payload);
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Live radar metadata unavailable from RainViewer.",
      },
      { status: 502 }
    );
  }
}
