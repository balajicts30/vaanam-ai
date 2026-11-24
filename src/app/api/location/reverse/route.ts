import { NextRequest, NextResponse } from "next/server";
import { GeoLocation } from "@/types/weather";

export async function GET(req: NextRequest) {
  const lat = parseFloat(req.nextUrl.searchParams.get("lat") || "");
  const lon = parseFloat(req.nextUrl.searchParams.get("lon") || "");

  if (Number.isNaN(lat) || Number.isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  }

  // Try OpenStreetMap Nominatim reverse geocoding first
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat.toFixed(5)}&lon=${lon.toFixed(
        5
      )}&format=json&addressdetails=1`,
      {
        headers: { "User-Agent": "VAANAM-AI-WeatherPortal/1.0" },
        signal: AbortSignal.timeout(7000),
      }
    );
    if (res.ok) {
      const json = await res.json();
      const addr = json.address || {};
      const name =
        addr.city ||
        addr.town ||
        addr.village ||
        addr.suburb ||
        addr.county ||
        addr.state_district ||
        "Detected Location";
      const location: GeoLocation = {
        id: `geo-${lat.toFixed(3)}-${lon.toFixed(3)}`,
        name: String(name),
        district: addr.state_district || addr.county || undefined,
        state: addr.state || undefined,
        country: addr.country || "",
        countryCode: addr.country_code ? String(addr.country_code).toUpperCase() : undefined,
        latitude: lat,
        longitude: lon,
        timezone: "auto",
        postalCode: addr.postcode || undefined,
        source: "geolocation",
      };
      return NextResponse.json({ location });
    }
  } catch {
    // Fallback below
  }

  // Fallback: BigDataCloud free reverse geocode client endpoint
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`,
      { signal: AbortSignal.timeout(6000) }
    );
    if (res.ok) {
      const json = await res.json();
      const location: GeoLocation = {
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
      return NextResponse.json({ location });
    }
  } catch {
    // Return coordinate-based location
  }

  const fallback: GeoLocation = {
    id: `geo-${lat.toFixed(3)}-${lon.toFixed(3)}`,
    name: `${lat.toFixed(3)}, ${lon.toFixed(3)}`,
    country: "Detected Coordinates",
    latitude: lat,
    longitude: lon,
    timezone: "auto",
    source: "geolocation",
  };
  return NextResponse.json({ location: fallback });
}
