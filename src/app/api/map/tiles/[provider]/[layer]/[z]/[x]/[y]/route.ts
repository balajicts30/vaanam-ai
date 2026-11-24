import { NextRequest, NextResponse } from "next/server";

const OWM_LAYERS = new Set([
  "temp_new",
  "precipitation_new",
  "clouds_new",
  "wind_new",
  "pressure_new",
]);

const MAPBOX_STYLES = new Set(["dark-v11", "satellite-streets-v12"]);
const MAPTILER_STYLES = new Set(["streets-v2-dark", "hybrid"]);

/**
 * Server-side authenticated map tile proxy.
 * Keeps OPENWEATHER_API_KEY, MAPBOX_ACCESS_TOKEN, and MAPTILER_API_KEY strictly on the server.
 */
export async function GET(
  _req: NextRequest,
  context: {
    params: Promise<{
      provider: string;
      layer: string;
      z: string;
      x: string;
      y: string;
    }>;
  }
) {
  const { provider, layer, z, x, y } = await context.params;
  const cleanY = y.replace(/\.png$|\.jpg$/i, "");

  if (!/^\d+$/.test(z) || !/^\d+$/.test(x) || !/^\d+$/.test(cleanY)) {
    return NextResponse.json({ error: "Invalid tile coordinates" }, { status: 400 });
  }

  let upstreamUrl: string | null = null;

  if (provider === "owm") {
    const key = process.env.OPENWEATHER_API_KEY?.trim();
    if (!key) {
      return NextResponse.json({ error: "OPENWEATHER_API_KEY not configured" }, { status: 503 });
    }
    if (!OWM_LAYERS.has(layer)) {
      return NextResponse.json({ error: "Unsupported OpenWeatherMap layer" }, { status: 400 });
    }
    upstreamUrl = `https://tile.openweathermap.org/map/${layer}/${z}/${x}/${cleanY}.png?appid=${encodeURIComponent(
      key
    )}`;
  } else if (provider === "mapbox") {
    const token = process.env.MAPBOX_ACCESS_TOKEN?.trim();
    if (!token) {
      return NextResponse.json({ error: "MAPBOX_ACCESS_TOKEN not configured" }, { status: 503 });
    }
    if (!MAPBOX_STYLES.has(layer)) {
      return NextResponse.json({ error: "Unsupported Mapbox style" }, { status: 400 });
    }
    upstreamUrl = `https://api.mapbox.com/styles/v1/mapbox/${layer}/tiles/256/${z}/${x}/${cleanY}?access_token=${encodeURIComponent(
      token
    )}`;
  } else if (provider === "maptiler") {
    const key = process.env.MAPTILER_API_KEY?.trim();
    if (!key) {
      return NextResponse.json({ error: "MAPTILER_API_KEY not configured" }, { status: 503 });
    }
    if (!MAPTILER_STYLES.has(layer)) {
      return NextResponse.json({ error: "Unsupported MapTiler style" }, { status: 400 });
    }
    upstreamUrl = `https://api.maptiler.com/maps/${layer}/256/${z}/${x}/${cleanY}.jpg?key=${encodeURIComponent(
      key
    )}`;
  } else {
    return NextResponse.json({ error: "Unknown map provider" }, { status: 400 });
  }

  try {
    const res = await fetch(upstreamUrl, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) {
      return NextResponse.json(
        { error: `Upstream tile provider returned HTTP ${res.status}` },
        { status: res.status }
      );
    }
    const contentType = res.headers.get("content-type") || "image/png";
    const buffer = await res.arrayBuffer();
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch {
    return NextResponse.json({ error: "Tile fetch failed" }, { status: 502 });
  }
}
