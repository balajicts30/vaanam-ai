import { ModelProvenance, ModelSeriesPoint } from "@/types/weather";

export interface WeatherNextResult {
  provenance: ModelProvenance;
  series: ModelSeriesPoint[];
}

/**
 * Google WeatherNext 3 Adapter
 * Documentation: https://developers.google.com/weathernext
 *
 * Access paths supported via server-side environment variables:
 * - WEATHERNEXT_API_ENDPOINT (optional authenticated proxy/Cloud Run service querying BigQuery/GCS/Earth Engine)
 * - GOOGLE_CLOUD_PROJECT + WEATHERNEXT_BQ_DATASET + GOOGLE_ACCESS_TOKEN (BigQuery REST API)
 *
 * IMPORTANT: Never fabricates WeatherNext 3 outputs when credentials/access are not configured.
 */
export async function fetchWeatherNext3(
  latitude: number,
  longitude: number
): Promise<WeatherNextResult> {
  const retrievedAt = new Date().toISOString();
  const proxyEndpoint = process.env.WEATHERNEXT_API_ENDPOINT;
  const gcpProject = process.env.GOOGLE_CLOUD_PROJECT;
  const gcpToken = process.env.GOOGLE_ACCESS_TOKEN;
  const bqDataset = process.env.WEATHERNEXT_BQ_DATASET || "weathernext_3";

  // Path 1: Custom authenticated WeatherNext bridge endpoint (GCS / Earth Engine / BigQuery)
  if (proxyEndpoint) {
    try {
      const url = new URL(proxyEndpoint);
      url.searchParams.set("lat", String(latitude));
      url.searchParams.set("lon", String(longitude));
      const res = await fetch(url.toString(), {
        headers: process.env.WEATHERNEXT_API_KEY
          ? { Authorization: `Bearer ${process.env.WEATHERNEXT_API_KEY}` }
          : undefined,
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) {
        throw new Error(`WeatherNext endpoint returned HTTP ${res.status}`);
      }
      const data = await res.json();
      const series: ModelSeriesPoint[] = Array.isArray(data.series) ? data.series : [];
      return {
        provenance: {
          id: "weathernext3",
          name: "Google WeatherNext 3",
          provider: "Google DeepMind / Google Cloud",
          status: series.length > 0 ? "LIVE" : "PARTIAL",
          statusMessage:
            series.length > 0
              ? "Connected to configured WeatherNext 3 data endpoint."
              : "Endpoint reachable but returned no forecast points for these coordinates.",
          documentationUrl: "https://developers.google.com/weathernext",
          initializationTime: data.initializationTime ?? null,
          issueTime: data.issueTime ?? null,
          retrievedAt,
          spatialResolution: "0.25° (~28 km global grid)",
          temporalResolution: "6-hourly / hourly where available",
          forecastHorizon: "15 days (ensemble members)",
          ensembleMembers: data.ensembleMembers ?? 50,
        },
        series,
      };
    } catch (err) {
      return {
        provenance: {
          id: "weathernext3",
          name: "Google WeatherNext 3",
          provider: "Google DeepMind / Google Cloud",
          status: "ERROR",
          statusMessage: `WeatherNext 3 endpoint error: ${err instanceof Error ? err.message : "Unknown error"}`,
          documentationUrl: "https://developers.google.com/weathernext",
          initializationTime: null,
          issueTime: null,
          retrievedAt,
          spatialResolution: "0.25° (~28 km global grid)",
          temporalResolution: "6-hourly",
          forecastHorizon: "15 days",
          ensembleMembers: 50,
        },
        series: [],
      };
    }
  }

  // Path 2: Direct Google BigQuery REST API if GCP credentials are supplied
  if (gcpProject && gcpToken) {
    try {
      const bqUrl = `https://bigquery.googleapis.com/bigquery/v2/projects/${encodeURIComponent(
        gcpProject
      )}/queries`;
      const query = `
        SELECT
          valid_time,
          AVG(temperature_2m) - 273.15 AS temp_c,
          AVG(total_precipitation_6hr) * 1000 AS precip_mm,
          AVG(SQRT(POW(u_component_of_wind_10m, 2) + POW(v_component_of_wind_10m, 2))) * 3.6 AS wind_kmh
        FROM \`${gcpProject}.${bqDataset}.forecasts\`
        WHERE ST_DWITHIN(geography, ST_GEOGPOINT(${longitude}, ${latitude}), 35000)
          AND valid_time >= CURRENT_TIMESTAMP()
        GROUP BY valid_time
        ORDER BY valid_time ASC
        LIMIT 60
      `;
      const res = await fetch(bqUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${gcpToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query, useLegacySql: false }),
        signal: AbortSignal.timeout(12000),
      });
      if (!res.ok) {
        throw new Error(`BigQuery HTTP ${res.status}`);
      }
      const json = await res.json();
      const rows = Array.isArray(json.rows) ? json.rows : [];
      const series: ModelSeriesPoint[] = rows.map(
        (r: { f: Array<{ v: string | null }> }) => ({
          time: r.f[0]?.v ?? "",
          temperature: r.f[1]?.v ? Number(r.f[1].v) : null,
          precipitation: r.f[2]?.v ? Number(r.f[2].v) : null,
          rainProbability: null,
          windSpeed: r.f[3]?.v ? Number(r.f[3].v) : null,
          cloudCover: null,
          pressure: null,
        })
      );

      return {
        provenance: {
          id: "weathernext3",
          name: "Google WeatherNext 3",
          provider: "Google DeepMind / BigQuery",
          status: series.length > 0 ? "LIVE" : "PARTIAL",
          statusMessage:
            series.length > 0
              ? `Live BigQuery forecast retrieved from ${gcpProject}.${bqDataset}.`
              : "Connected to BigQuery, but no matching rows were returned for this coordinate.",
          documentationUrl: "https://developers.google.com/weathernext",
          initializationTime: retrievedAt,
          issueTime: retrievedAt,
          retrievedAt,
          spatialResolution: "0.25° (~28 km global grid)",
          temporalResolution: "6-hourly",
          forecastHorizon: "15 days",
          ensembleMembers: 50,
        },
        series,
      };
    } catch (err) {
      return {
        provenance: {
          id: "weathernext3",
          name: "Google WeatherNext 3",
          provider: "Google DeepMind / BigQuery",
          status: "ERROR",
          statusMessage: `BigQuery query failed: ${err instanceof Error ? err.message : "Unknown error"}`,
          documentationUrl: "https://developers.google.com/weathernext",
          initializationTime: null,
          issueTime: null,
          retrievedAt,
          spatialResolution: "0.25° (~28 km global grid)",
          temporalResolution: "6-hourly",
          forecastHorizon: "15 days",
          ensembleMembers: 50,
        },
        series: [],
      };
    }
  }

  // Path 3: Public live Google DeepMind WeatherNext 2 Ensemble (64-member) via Open-Meteo
  // Works out of the box without API keys (including static GitHub Pages mode).
  try {
    const params = new URLSearchParams({
      latitude: latitude.toFixed(4),
      longitude: longitude.toFixed(4),
      timezone: "auto",
      forecast_days: "15",
      models: "google_weathernext2_ensemble",
      hourly: "temperature_2m,precipitation,wind_speed_10m,cloud_cover,pressure_msl",
    });

    const res = await fetch(
      `https://ensemble-api.open-meteo.com/v1/ensemble?${params.toString()}`,
      { signal: AbortSignal.timeout(14000) }
    );

    if (res.ok) {
      const json = (await res.json()) as {
        hourly?: Record<string, unknown>;
      };
      const hourly = json.hourly;
      const times = Array.isArray(hourly?.time) ? (hourly.time as string[]) : [];

      if (hourly && times.length > 0) {
        const keys = Object.keys(hourly);
        const tempKeys = keys.filter((k) => k === "temperature_2m" || k.startsWith("temperature_2m_member"));
        const precipKeys = keys.filter((k) => k === "precipitation" || k.startsWith("precipitation_member"));
        const windKeys = keys.filter((k) => k === "wind_speed_10m" || k.startsWith("wind_speed_10m_member"));
        const cloudKeys = keys.filter((k) => k === "cloud_cover" || k.startsWith("cloud_cover_member"));
        const pressKeys = keys.filter((k) => k === "pressure_msl" || k.startsWith("pressure_msl_member"));

        const avgAt = (memberKeys: string[], idx: number): number | null => {
          let sum = 0;
          let count = 0;
          for (const k of memberKeys) {
            const arr = hourly[k] as Array<number | null> | undefined;
            const v = arr?.[idx];
            if (typeof v === "number" && !Number.isNaN(v)) {
              sum += v;
              count++;
            }
          }
          return count > 0 ? Number((sum / count).toFixed(2)) : null;
        };

        const rainProbAt = (idx: number): number | null => {
          let wet = 0;
          let count = 0;
          for (const k of precipKeys) {
            const arr = hourly[k] as Array<number | null> | undefined;
            const v = arr?.[idx];
            if (typeof v === "number" && !Number.isNaN(v)) {
              count++;
              if (v >= 0.1) wet++;
            }
          }
          return count > 0 ? Math.round((wet / count) * 100) : null;
        };

        const series: ModelSeriesPoint[] = times.map((time, idx) => ({
          time,
          temperature: avgAt(tempKeys, idx),
          precipitation: avgAt(precipKeys, idx),
          rainProbability: rainProbAt(idx),
          windSpeed: avgAt(windKeys, idx),
          cloudCover: avgAt(cloudKeys, idx),
          pressure: avgAt(pressKeys, idx),
        }));

        const memberCount = Math.max(tempKeys.length, precipKeys.length, 64);

        return {
          provenance: {
            id: "weathernext3",
            name: "Google WeatherNext 2 (AI Ensemble)",
            provider: "Google DeepMind via Open-Meteo",
            status: "LIVE",
            statusMessage: `Live ${memberCount}-member Google DeepMind WeatherNext 2 AI ensemble feed active. (Optional: configure GCP credentials for private WeatherNext 3 BigQuery access.)`,
            documentationUrl: "https://developers.google.com/weathernext",
            initializationTime: times[0] ?? retrievedAt,
            issueTime: retrievedAt,
            retrievedAt,
            spatialResolution: "0.25° (~28 km global grid)",
            temporalResolution: "Hourly (6-hourly native)",
            forecastHorizon: "15 days",
            ensembleMembers: memberCount,
          },
          series,
        };
      }
    }
  } catch {
    // Fall through to transparent status message if Open-Meteo WeatherNext feed is unreachable
  }

  // Fallback if both private WeatherNext 3 credentials and public WeatherNext 2 feed are unavailable
  return {
    provenance: {
      id: "weathernext3",
      name: "Google WeatherNext",
      provider: "Google DeepMind / Google Cloud",
      status: "CREDENTIALS_REQUIRED",
      statusMessage:
        "Public WeatherNext 2 feed temporarily unavailable and private WeatherNext 3 GCP credentials are not configured. No simulated values are substituted.",
      documentationUrl: "https://developers.google.com/weathernext",
      initializationTime: null,
      issueTime: null,
      retrievedAt,
      spatialResolution: "0.25° (~28 km global grid)",
      temporalResolution: "6-hourly ensemble output",
      forecastHorizon: "15 days",
      ensembleMembers: 64,
      setupRequirement:
        "Optional: set GOOGLE_CLOUD_PROJECT, WEATHERNEXT_BQ_DATASET, and GOOGLE_ACCESS_TOKEN (or WEATHERNEXT_API_ENDPOINT) in .env.local for private WeatherNext 3.",
    },
    series: [],
  };
}
