import { NextRequest, NextResponse } from "next/server";
import { serverCache } from "@/lib/cache";
import { getWeatherIntelligence } from "@/lib/models/aggregator";
import { GeoLocation } from "@/types/weather";

export async function GET(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "local";
  if (!serverCache.checkRateLimit(`weather:${ip}`, 45, 60)) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Please retry in a moment." },
      { status: 429 }
    );
  }

  const sp = req.nextUrl.searchParams;
  const lat = parseFloat(sp.get("lat") || "");
  const lon = parseFloat(sp.get("lon") || "");

  if (Number.isNaN(lat) || Number.isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return NextResponse.json({ error: "Valid lat and lon parameters are required." }, { status: 400 });
  }

  const location: GeoLocation = {
    id: sp.get("id") || `loc-${lat.toFixed(3)}-${lon.toFixed(3)}`,
    name: sp.get("name") || `${lat.toFixed(2)}, ${lon.toFixed(2)}`,
    district: sp.get("district") || undefined,
    state: sp.get("state") || undefined,
    country: sp.get("country") || "",
    countryCode: sp.get("countryCode") || undefined,
    latitude: lat,
    longitude: lon,
    timezone: sp.get("timezone") || "auto",
    source: "search",
  };

  try {
    const payload = await getWeatherIntelligence(location);
    return NextResponse.json(payload);
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Unable to retrieve live weather model data from upstream providers.",
      },
      { status: 502 }
    );
  }
}
