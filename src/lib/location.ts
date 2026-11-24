import { GeoLocation } from "@/types/weather";

export const PRESET_LOCATIONS: GeoLocation[] = [
  {
    id: "chennai-in",
    name: "Chennai",
    district: "Chennai",
    state: "Tamil Nadu",
    country: "India",
    countryCode: "IN",
    latitude: 13.0827,
    longitude: 80.2707,
    timezone: "Asia/Kolkata",
    source: "preset",
  },
  {
    id: "tambaram-in",
    name: "Tambaram",
    district: "Chengalpattu",
    state: "Tamil Nadu",
    country: "India",
    countryCode: "IN",
    latitude: 12.9249,
    longitude: 80.1,
    timezone: "Asia/Kolkata",
    source: "preset",
  },
  {
    id: "mahabalipuram-in",
    name: "Mahabalipuram",
    district: "Chengalpattu",
    state: "Tamil Nadu",
    country: "India",
    countryCode: "IN",
    latitude: 12.6269,
    longitude: 80.1927,
    timezone: "Asia/Kolkata",
    source: "preset",
  },
  {
    id: "coimbatore-in",
    name: "Coimbatore",
    district: "Coimbatore",
    state: "Tamil Nadu",
    country: "India",
    countryCode: "IN",
    latitude: 11.0168,
    longitude: 76.9558,
    timezone: "Asia/Kolkata",
    source: "preset",
  },
  {
    id: "madurai-in",
    name: "Madurai",
    district: "Madurai",
    state: "Tamil Nadu",
    country: "India",
    countryCode: "IN",
    latitude: 9.9252,
    longitude: 78.1198,
    timezone: "Asia/Kolkata",
    source: "preset",
  },
  {
    id: "bengaluru-in",
    name: "Bengaluru",
    district: "Bengaluru Urban",
    state: "Karnataka",
    country: "India",
    countryCode: "IN",
    latitude: 12.9716,
    longitude: 77.5946,
    timezone: "Asia/Kolkata",
    source: "preset",
  },
  {
    id: "mumbai-in",
    name: "Mumbai",
    district: "Mumbai",
    state: "Maharashtra",
    country: "India",
    countryCode: "IN",
    latitude: 19.076,
    longitude: 72.8777,
    timezone: "Asia/Kolkata",
    source: "preset",
  },
  {
    id: "delhi-in",
    name: "New Delhi",
    district: "New Delhi",
    state: "Delhi",
    country: "India",
    countryCode: "IN",
    latitude: 28.6139,
    longitude: 77.209,
    timezone: "Asia/Kolkata",
    source: "preset",
  },
];

export function parseCoordinateQuery(query: string): { lat: number; lon: number } | null {
  const cleaned = query.trim();
  const match = cleaned.match(/^(-?\d{1,2}(?:\.\d+)?)\s*[,;\s]\s*(-?\d{1,3}(?:\.\d+)?)$/);
  if (!match) return null;
  const lat = parseFloat(match[1]);
  const lon = parseFloat(match[2]);
  if (Number.isNaN(lat) || Number.isNaN(lon)) return null;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
  return { lat, lon };
}

export function isInsideUsHrefCoverage(lat: number, lon: number): boolean {
  // NOAA HREF CONUS domain coverage
  return lat >= 21.0 && lat <= 53.0 && lon >= -134.0 && lon <= -60.0;
}

export function isInsideIndia(lat: number, lon: number, countryCode?: string): boolean {
  if (countryCode?.toUpperCase() === "IN") return true;
  return lat >= 6.5 && lat <= 37.5 && lon >= 68.0 && lon <= 97.5;
}

export function getZoomEarthUrl(loc: GeoLocation): string {
  return `https://zoom.earth/maps/radar/#view=${loc.latitude.toFixed(4)},${loc.longitude.toFixed(4)},8z`;
}
