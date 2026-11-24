import { isInsideUsHrefCoverage } from "@/lib/location";
import { ModelProvenance, ModelSeriesPoint } from "@/types/weather";

export interface HrefResult {
  provenance: ModelProvenance;
  series: ModelSeriesPoint[];
}

/**
 * NOAA HREF / High-Resolution Convective US Domain Adapter
 * Documentation: https://www.emc.ncep.noaa.gov/emc/pages/numerical_forecast_systems/href-hiresw.php
 *
 * Strictly enforces US geographical coverage. Never extrapolates to India or uncovered regions.
 */
export async function fetchNoaaHref(
  latitude: number,
  longitude: number
): Promise<HrefResult> {
  const retrievedAt = new Date().toISOString();

  if (!isInsideUsHrefCoverage(latitude, longitude)) {
    return {
      provenance: {
        id: "noaa_href",
        name: "NOAA HREF / HRRR (US High-Res)",
        provider: "NOAA NCEP",
        status: "UNAVAILABLE_OUTSIDE_COVERAGE",
        statusMessage:
          "Unavailable for this location. NOAA HREF covers US regional domains (CONUS) only and is never extrapolated to India or uncovered global regions.",
        documentationUrl:
          "https://www.emc.ncep.noaa.gov/emc/pages/numerical_forecast_systems/href-hiresw.php",
        initializationTime: null,
        issueTime: null,
        retrievedAt,
        spatialResolution: "3 km (US Regional Domain Only)",
        temporalResolution: "Hourly (0–48 hours)",
        forecastHorizon: "48 hours",
        ensembleMembers: 10,
      },
      series: [],
    };
  }

  try {
    const params = new URLSearchParams({
      latitude: latitude.toFixed(4),
      longitude: longitude.toFixed(4),
      timezone: "auto",
      forecast_days: "2",
      models: "ncep_hrrr_conus",
      hourly: [
        "temperature_2m",
        "precipitation",
        "wind_speed_10m",
        "cloud_cover",
        "pressure_msl",
      ].join(","),
    });

    const res = await fetch(
      `https://api.open-meteo.com/v1/gfs?${params.toString()}`,
      { signal: AbortSignal.timeout(10000) }
    );
    if (!res.ok) {
      throw new Error(`NOAA HRRR/CONUS endpoint HTTP ${res.status}`);
    }
    const json = await res.json();
    const h = json.hourly || {};
    const times: string[] = h.time || [];
    const series: ModelSeriesPoint[] = times.slice(0, 48).map((t, i) => ({
      time: t,
      temperature: typeof h.temperature_2m?.[i] === "number" ? Number(h.temperature_2m[i].toFixed(1)) : null,
      precipitation: typeof h.precipitation?.[i] === "number" ? Number(h.precipitation[i].toFixed(2)) : null,
      rainProbability: null,
      windSpeed: typeof h.wind_speed_10m?.[i] === "number" ? Number(h.wind_speed_10m[i].toFixed(1)) : null,
      cloudCover: typeof h.cloud_cover?.[i] === "number" ? Math.round(h.cloud_cover[i]) : null,
      pressure: typeof h.pressure_msl?.[i] === "number" ? Number(h.pressure_msl[i].toFixed(1)) : null,
    }));

    return {
      provenance: {
        id: "noaa_href",
        name: "NOAA HREF / HRRR (US High-Res)",
        provider: "NOAA NCEP (CONUS 3 km)",
        status: series.length > 0 ? "LIVE" : "PARTIAL",
        statusMessage:
          "Live US high-resolution convective forecast (3 km CONUS domain) active.",
        documentationUrl:
          "https://www.emc.ncep.noaa.gov/emc/pages/numerical_forecast_systems/href-hiresw.php",
        initializationTime: times[0] ?? null,
        issueTime: retrievedAt,
        retrievedAt,
        spatialResolution: "3 km (CONUS)",
        temporalResolution: "Hourly",
        forecastHorizon: "48 hours",
        ensembleMembers: 10,
      },
      series,
    };
  } catch (err) {
    return {
      provenance: {
        id: "noaa_href",
        name: "NOAA HREF / HRRR (US High-Res)",
        provider: "NOAA NCEP",
        status: "ERROR",
        statusMessage: `Failed to retrieve US high-resolution data: ${err instanceof Error ? err.message : "Unknown error"}`,
        documentationUrl:
          "https://www.emc.ncep.noaa.gov/emc/pages/numerical_forecast_systems/href-hiresw.php",
        initializationTime: null,
        issueTime: null,
        retrievedAt,
        spatialResolution: "3 km (CONUS)",
        temporalResolution: "Hourly",
        forecastHorizon: "48 hours",
        ensembleMembers: 10,
      },
      series: [],
    };
  }
}
