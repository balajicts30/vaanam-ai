import { getWeatherCodeInfo } from "./weather-codes";

export interface WeatherPhotoAsset {
  id: string;
  title: string;
  url: string;
  photographer: string;
  license: string;
  sourceUrl: string;
  disclaimer: string;
  moodColor: string;
}

const CURATED_PHOTOS: Record<string, WeatherPhotoAsset> = {
  clear: {
    id: "clear-sky",
    title: "Bright Clear Sky & Sunlight",
    url: "https://images.unsplash.com/photo-1601297183305-6df142704ea2?auto=format&fit=crop&w=1400&q=80",
    photographer: "Unsplash Editorial",
    license: "Unsplash License",
    sourceUrl: "https://unsplash.com/photos/photo-1601297183305-6df142704ea2",
    disclaimer: "Curated editorial weather illustration — not a live photograph of this location.",
    moodColor: "#0284c7",
  },
  heatwave: {
    id: "heatwave-sun",
    title: "Intense Sunlight & Warm Haze",
    url: "https://images.unsplash.com/photo-1504370805625-d32c54b16100?auto=format&fit=crop&w=1400&q=80",
    photographer: "Unsplash Editorial",
    license: "Unsplash License",
    sourceUrl: "https://unsplash.com/photos/photo-1504370805625-d32c54b16100",
    disclaimer: "Curated editorial weather illustration — not a live photograph of this location.",
    moodColor: "#ea580c",
  },
  coastal: {
    id: "coastal-breeze",
    title: "Coastal Horizon & Sea Clouds",
    url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1400&q=80",
    photographer: "Unsplash Editorial",
    license: "Unsplash License",
    sourceUrl: "https://unsplash.com/photos/photo-1507525428034-b723cf961d3e",
    disclaimer: "Curated editorial weather illustration — not a live photograph of this location.",
    moodColor: "#0891b2",
  },
  partly_cloudy: {
    id: "partly-cloudy",
    title: "Scattered Clouds & Sky",
    url: "https://images.unsplash.com/photo-1534088568595-a066f410bcda?auto=format&fit=crop&w=1400&q=80",
    photographer: "Unsplash Editorial",
    license: "Unsplash License",
    sourceUrl: "https://unsplash.com/photos/photo-1534088568595-a066f410bcda",
    disclaimer: "Curated editorial weather illustration — not a live photograph of this location.",
    moodColor: "#2563eb",
  },
  cloudy: {
    id: "overcast-clouds",
    title: "Overcast Atmospheric Cloud Deck",
    url: "https://images.unsplash.com/photo-1513002749550-c59d786b8e6c?auto=format&fit=crop&w=1400&q=80",
    photographer: "Unsplash Editorial",
    license: "Unsplash License",
    sourceUrl: "https://unsplash.com/photos/photo-1513002749550-c59d786b8e6c",
    disclaimer: "Curated editorial weather illustration — not a live photograph of this location.",
    moodColor: "#475569",
  },
  rain: {
    id: "monsoon-rain",
    title: "Rainfall & Wet Surfaces",
    url: "https://images.unsplash.com/photo-1519692933481-e162a57d6721?auto=format&fit=crop&w=1400&q=80",
    photographer: "Unsplash Editorial",
    license: "Unsplash License",
    sourceUrl: "https://unsplash.com/photos/photo-1519692933481-e162a57d6721",
    disclaimer: "Curated editorial weather illustration — not a live photograph of this location.",
    moodColor: "#1d4ed8",
  },
  heavy_rain: {
    id: "heavy-monsoon",
    title: "Heavy Monsoon Downpour",
    url: "https://images.unsplash.com/photo-1428592953211-077101b2021b?auto=format&fit=crop&w=1400&q=80",
    photographer: "Unsplash Editorial",
    license: "Unsplash License",
    sourceUrl: "https://unsplash.com/photos/photo-1428592953211-077101b2021b",
    disclaimer: "Curated editorial weather illustration — not a live photograph of this location.",
    moodColor: "#1e3a8a",
  },
  thunderstorm: {
    id: "thunderstorm-lightning",
    title: "Dramatic Thunderstorm & Lightning",
    url: "https://images.unsplash.com/photo-1605727216801-e27ce1d0cc28?auto=format&fit=crop&w=1400&q=80",
    photographer: "Unsplash Editorial",
    license: "Unsplash License",
    sourceUrl: "https://unsplash.com/photos/photo-1605727216801-e27ce1d0cc28",
    disclaimer: "Curated editorial weather illustration — not a live photograph of this location.",
    moodColor: "#4f46e5",
  },
  fog: {
    id: "fog-mist",
    title: "Atmospheric Fog & Mist",
    url: "https://images.unsplash.com/photo-1487621167305-5d248087c724?auto=format&fit=crop&w=1400&q=80",
    photographer: "Unsplash Editorial",
    license: "Unsplash License",
    sourceUrl: "https://unsplash.com/photos/photo-1487621167305-5d248087c724",
    disclaimer: "Curated editorial weather illustration — not a live photograph of this location.",
    moodColor: "#64748b",
  },
};

const COASTAL_CITIES = new Set([
  "chennai",
  "mahabalipuram",
  "mumbai",
  "puducherry",
  "pondicherry",
  "visakhapatnam",
  "kochi",
  "tuticorin",
  "thoothukudi",
  "nagapattinam",
  "cuddalore",
  "kanyakumari",
  "rameswaram",
]);

export function resolveWeatherPhoto(
  weatherCode: number,
  temperatureC: number | null,
  cityName?: string
): WeatherPhotoAsset {
  const info = getWeatherCodeInfo(weatherCode);

  if (info.category === "thunderstorm") return CURATED_PHOTOS.thunderstorm;
  if (info.category === "heavy_rain") return CURATED_PHOTOS.heavy_rain;
  if (info.category === "rain" || info.category === "drizzle") return CURATED_PHOTOS.rain;
  if (info.category === "fog") return CURATED_PHOTOS.fog;
  if (temperatureC !== null && temperatureC >= 37 && info.category === "clear") {
    return CURATED_PHOTOS.heatwave;
  }
  if (
    cityName &&
    COASTAL_CITIES.has(cityName.toLowerCase()) &&
    (info.category === "clear" || info.category === "partly_cloudy")
  ) {
    return CURATED_PHOTOS.coastal;
  }
  if (info.category === "cloudy") return CURATED_PHOTOS.cloudy;
  if (info.category === "partly_cloudy") return CURATED_PHOTOS.partly_cloudy;
  return CURATED_PHOTOS.clear;
}
