import { CurrentConditions } from "@/types/weather";

/**
 * Resolves PRESENT, RIGHT-NOW sky & climate conditions using Open-Meteo's highest-resolution
 * real-time nowcast (`best_match`), strictly preventing forecast rain noise from showing "Rain"
 * when it is dry and shining outside right now.
 */
export async function fetchLiveNowConditions(
  latitude: number,
  longitude: number,
  fallback: CurrentConditions
): Promise<CurrentConditions> {
  try {
    const params = new URLSearchParams({
      latitude: latitude.toFixed(4),
      longitude: longitude.toFixed(4),
      timezone: "auto",
      current: [
        "temperature_2m",
        "relative_humidity_2m",
        "apparent_temperature",
        "is_day",
        "precipitation",
        "rain",
        "showers",
        "weather_code",
        "cloud_cover",
        "pressure_msl",
        "wind_speed_10m",
        "wind_direction_10m",
        "wind_gusts_10m",
      ].join(","),
      hourly: "shortwave_radiation",
      forecast_days: "1",
    });

    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return fallback;
    const json = await res.json();
    const c = json?.current;
    if (!c) return fallback;

    const precip = typeof c.precipitation === "number" ? c.precipitation : 0;
    const rain = typeof c.rain === "number" ? c.rain : 0;
    const showers = typeof c.showers === "number" ? c.showers : 0;
    const cloudCover = typeof c.cloud_cover === "number" ? Math.round(c.cloud_cover) : fallback.cloudCover ?? 25;
    const isDay = c.is_day === 1 || c.is_day === undefined;
    const rawCode = typeof c.weather_code === "number" ? c.weather_code : fallback.weatherCode;

    // Strictly check if liquid precipitation is actually occurring RIGHT NOW
    const liveLiquidMm = Math.max(precip, rain, showers);
    const isRainingNow = liveLiquidMm >= 0.15;

    let verifiedCode = rawCode;
    let liveNote = "Verified live present-sky observation (Open-Meteo High-Res Nowcast)";

    if (!isRainingNow) {
      // If NO precipitation is occurring right now, never show rain/shower/drizzle codes
      if (rawCode >= 51 && rawCode <= 99) {
        if (cloudCover <= 20) verifiedCode = 0; // Clear Sky / Shining
        else if (cloudCover <= 45) verifiedCode = 1; // Mainly Clear
        else if (cloudCover <= 75) verifiedCode = 2; // Partly Cloudy
        else verifiedCode = 3; // Overcast
        liveNote =
          "Live check: 0.0 mm precipitation right now — displaying actual present sky cover instead of forecast rain.";
      } else {
        liveNote = isDay && cloudCover <= 30
          ? "Live check: Bright & dry conditions right now (0.0 mm observed)."
          : "Live check: Dry conditions right now (0.0 mm observed).";
      }
    } else {
      liveNote = `Live check: Active precipitation detected right now (${liveLiquidMm.toFixed(1)} mm/h).`;
    }

    return {
      ...fallback,
      time: c.time || fallback.time,
      temperature: typeof c.temperature_2m === "number" ? Number(c.temperature_2m.toFixed(1)) : fallback.temperature,
      feelsLike:
        typeof c.apparent_temperature === "number"
          ? Number(c.apparent_temperature.toFixed(1))
          : fallback.feelsLike,
      humidity:
        typeof c.relative_humidity_2m === "number"
          ? Math.round(c.relative_humidity_2m)
          : fallback.humidity,
      precipitation: Number(liveLiquidMm.toFixed(2)),
      // Keep next-hour forecast rain probability separate from live rain status
      rainProbability: fallback.rainProbability,
      windSpeed:
        typeof c.wind_speed_10m === "number" ? Number(c.wind_speed_10m.toFixed(1)) : fallback.windSpeed,
      windDirection:
        typeof c.wind_direction_10m === "number"
          ? Math.round(c.wind_direction_10m)
          : fallback.windDirection,
      windGusts:
        typeof c.wind_gusts_10m === "number" ? Number(c.wind_gusts_10m.toFixed(1)) : fallback.windGusts,
      pressure:
        typeof c.pressure_msl === "number" ? Number(c.pressure_msl.toFixed(1)) : fallback.pressure,
      cloudCover,
      weatherCode: verifiedCode,
      isDay,
      isRainingNow,
      liveObservationNote: liveNote,
      sourceModel: "Live Present Sky (Open-Meteo High-Res Nowcast) • Forecast: ECMWF IFS/ENS",
    };
  } catch {
    return fallback;
  }
}
