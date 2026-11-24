import { NextResponse } from "next/server";

/**
 * Returns only boolean availability flags for configured server-side map providers.
 * Never exposes API keys or tokens to the browser.
 */
export async function GET() {
  return NextResponse.json({
    openWeatherEnabled: Boolean(process.env.OPENWEATHER_API_KEY?.trim()),
    mapboxEnabled: Boolean(process.env.MAPBOX_ACCESS_TOKEN?.trim()),
    maptilerEnabled: Boolean(process.env.MAPTILER_API_KEY?.trim()),
  });
}
