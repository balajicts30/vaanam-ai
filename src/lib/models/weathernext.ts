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

  // Credentials not configured — transparently report requirement without fabricating data
  return {
    provenance: {
      id: "weathernext3",
      name: "Google WeatherNext 3",
      provider: "Google DeepMind / Google Cloud",
      status: "CREDENTIALS_REQUIRED",
      statusMessage:
        "Google Cloud credentials & WeatherNext dataset access are required. Configure GOOGLE_CLOUD_PROJECT + GOOGLE_ACCESS_TOKEN (or WEATHERNEXT_API_ENDPOINT) in .env.local to activate live WeatherNext 3 data. No simulated values are substituted.",
      documentationUrl: "https://developers.google.com/weathernext",
      initializationTime: null,
      issueTime: null,
      retrievedAt,
      spatialResolution: "0.25° (~28 km global grid)",
      temporalResolution: "6-hourly ensemble output",
      forecastHorizon: "15 days",
      ensembleMembers: 50,
      setupRequirement:
        "Set GOOGLE_CLOUD_PROJECT, WEATHERNEXT_BQ_DATASET, and GOOGLE_ACCESS_TOKEN (or WEATHERNEXT_API_ENDPOINT) in server environment variables.",
    },
    series: [],
  };
}
