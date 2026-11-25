import { serverCache } from "@/lib/cache";
import { GeoLocation, WeatherIntelligencePayload } from "@/types/weather";
import { gatherWeatherAlerts } from "./alerts";
import { buildModelComparison } from "./comparison";
import { fetchEcmwfData } from "./ecmwf";
import { fetchExtendedRangeDays16To30 } from "./extended";
import { fetchNoaaHref } from "./href";
import { fetchLiveNowConditions } from "./live-now";
import { fetchWeatherNext3 } from "./weathernext";

export async function getWeatherIntelligence(
  location: GeoLocation
): Promise<WeatherIntelligencePayload> {
  const cacheKey = `weather:${location.latitude.toFixed(2)},${location.longitude.toFixed(2)}`;
  const cached = serverCache.get<WeatherIntelligencePayload>(cacheKey);
  if (cached) {
    return {
      ...cached,
      location: { ...location, timezone: cached.location.timezone || location.timezone },
    };
  }

  // Run independent model adapters concurrently so no single provider outage breaks the portal
  const [ecmwfSettled, weatherNextSettled, hrefSettled] = await Promise.allSettled([
    fetchEcmwfData(location.latitude, location.longitude),
    fetchWeatherNext3(location.latitude, location.longitude),
    fetchNoaaHref(location.latitude, location.longitude),
  ]);

  if (ecmwfSettled.status === "rejected") {
    throw new Error(
      `Primary ECMWF forecast provider failed: ${
        ecmwfSettled.reason instanceof Error
          ? ecmwfSettled.reason.message
          : String(ecmwfSettled.reason)
      }`
    );
  }

  const ecmwf = ecmwfSettled.value;
  const resolvedLocation: GeoLocation = {
    ...location,
    timezone: ecmwf.timezone || location.timezone || "UTC",
  };

  // Compute baseline temperature mean from Days 1-15 for extended-range anomaly comparison
  const d15Temps = ecmwf.daily15
    .map((d) => d.tempMean)
    .filter((v): v is number => v !== null);
  const baselineMean =
    d15Temps.length > 0
      ? d15Temps.reduce((a, b) => a + b, 0) / d15Temps.length
      : null;

  const [extendedSettled, alertsSettled, liveNowSettled] = await Promise.allSettled([
    fetchExtendedRangeDays16To30(location.latitude, location.longitude, baselineMean),
    gatherWeatherAlerts(resolvedLocation, ecmwf.hourly, ecmwf.daily15),
    fetchLiveNowConditions(location.latitude, location.longitude, ecmwf.current),
  ]);

  const liveCurrent =
    liveNowSettled.status === "fulfilled" ? liveNowSettled.value : ecmwf.current;

  const weatherNext =
    weatherNextSettled.status === "fulfilled"
      ? weatherNextSettled.value
      : {
          provenance: {
            id: "weathernext3" as const,
            name: "Google WeatherNext 3",
            provider: "Google DeepMind / Google Cloud",
            status: "ERROR" as const,
            statusMessage: "Adapter execution failed.",
            documentationUrl: "https://developers.google.com/weathernext",
            initializationTime: null,
            issueTime: null,
            retrievedAt: new Date().toISOString(),
            spatialResolution: "0.25°",
            temporalResolution: "6-hourly",
            forecastHorizon: "15 days",
            ensembleMembers: 50,
          },
          series: [],
        };

  const href =
    hrefSettled.status === "fulfilled"
      ? hrefSettled.value
      : {
          provenance: {
            id: "noaa_href" as const,
            name: "NOAA HREF / HRRR (US High-Res)",
            provider: "NOAA NCEP",
            status: "ERROR" as const,
            statusMessage: "Adapter execution failed.",
            documentationUrl:
              "https://www.emc.ncep.noaa.gov/emc/pages/numerical_forecast_systems/href-hiresw.php",
            initializationTime: null,
            issueTime: null,
            retrievedAt: new Date().toISOString(),
            spatialResolution: "3 km",
            temporalResolution: "Hourly",
            forecastHorizon: "48 hours",
            ensembleMembers: 10,
          },
          series: [],
        };

  const extended =
    extendedSettled.status === "fulfilled"
      ? extendedSettled.value
      : {
          provenance: {
            id: "extended_seas5" as const,
            name: "ECMWF SEAS5 Extended-Range",
            provider: "ECMWF Seasonal",
            status: "ERROR" as const,
            statusMessage: "Extended-range Days 16–30 unavailable.",
            documentationUrl:
              "https://www.ecmwf.int/en/forecasts/documentation-and-support/long-range",
            initializationTime: null,
            issueTime: null,
            retrievedAt: new Date().toISOString(),
            spatialResolution: "1.0°",
            temporalResolution: "Daily trend",
            forecastHorizon: "Days 16–30",
            ensembleMembers: 51,
          },
          days16to30: [],
          series: [],
        };

  const alerts = alertsSettled.status === "fulfilled" ? alertsSettled.value : [];

  const daily30 = [...ecmwf.daily15, ...extended.days16to30];
  const models = [
    weatherNext.provenance,
    ecmwf.ensProvenance,
    ecmwf.ifsProvenance,
    href.provenance,
    extended.provenance,
  ];

  const comparison = buildModelComparison({
    ecmwf_ifs: ecmwf.ifsSeries,
    ecmwf_ens: ecmwf.ensSeries,
    weathernext3: weatherNext.series,
    noaa_href: href.series,
    extended_seas5: extended.series,
  });

  const liveSourcesCount = models.filter((m) => m.status === "LIVE").length;
  const degradedSources = models
    .filter((m) => m.status !== "LIVE")
    .map((m) => ({ name: m.name, reason: m.statusMessage }));

  const nearTermConf = ecmwf.daily15[0]?.confidence ?? "MODERATE";

  const payload: WeatherIntelligencePayload = {
    location: resolvedLocation,
    retrievedAt: new Date().toISOString(),
    current: liveCurrent,
    hourly: ecmwf.hourly,
    daily30,
    models,
    comparison,
    alerts,
    dataQuality: {
      liveSourcesCount,
      totalSourcesCount: models.length,
      degradedSources,
      lastSuccessfulUpdate: new Date().toISOString(),
      overallConfidence: nearTermConf,
    },
  };

  // Cache for 10 minutes
  serverCache.set(cacheKey, payload, 600);
  return payload;
}
