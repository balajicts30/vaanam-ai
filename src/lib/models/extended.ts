import { DailyForecastPoint, ModelProvenance, ModelSeriesPoint } from "@/types/weather";

export interface ExtendedRangeResult {
  provenance: ModelProvenance;
  days16to30: DailyForecastPoint[];
  series: ModelSeriesPoint[];
}

function mean(nums: number[]): number | null {
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function stdDev(nums: number[]): number | null {
  if (nums.length < 2) return null;
  const m = mean(nums)!;
  return Math.sqrt(nums.reduce((acc, v) => acc + (v - m) ** 2, 0) / nums.length);
}

/**
 * Extended-Range Days 16–30 Adapter
 * Uses Open-Meteo Seasonal Forecast API (ECMWF SEAS5 51-member extended-range ensemble).
 * Never generates fake hourly forecasts for Days 16–30.
 */
export async function fetchExtendedRangeDays16To30(
  latitude: number,
  longitude: number,
  baselineTempMeanC: number | null
): Promise<ExtendedRangeResult> {
  const retrievedAt = new Date().toISOString();

  try {
    const params = new URLSearchParams({
      latitude: latitude.toFixed(4),
      longitude: longitude.toFixed(4),
      timezone: "auto",
      forecast_days: "45",
      models: "ecmwf_seas5",
      daily: [
        "temperature_2m_max",
        "temperature_2m_min",
        "precipitation_sum",
        "wind_speed_10m_max",
        "relative_humidity_2m_mean",
      ].join(","),
    });

    const res = await fetch(
      `https://seasonal-api.open-meteo.com/v1/seasonal?${params.toString()}`,
      { signal: AbortSignal.timeout(15000) }
    );
    if (!res.ok) {
      throw new Error(`ECMWF SEAS5 Seasonal API HTTP ${res.status}`);
    }
    const json = await res.json();
    const d = json.daily || {};
    const dates: string[] = d.time || [];

    const maxKeys = Object.keys(d).filter((k) => /^temperature_2m_max(_member\d+)?$/.test(k));
    const minKeys = Object.keys(d).filter((k) => /^temperature_2m_min(_member\d+)?$/.test(k));
    const precipKeys = Object.keys(d).filter((k) => /^precipitation_sum(_member\d+)?$/.test(k));
    const windKeys = Object.keys(d).filter((k) => /^wind_speed_10m_max(_member\d+)?$/.test(k));
    const humKeys = Object.keys(d).filter((k) => /^relative_humidity_2m_mean(_member\d+)?$/.test(k));

    const memberCount = Math.max(maxKeys.length, precipKeys.length, 1);

    // Compute baseline from Days 1-15 of SEAS5 if not supplied
    const baselineTemps: number[] = [];
    for (let i = 0; i < Math.min(15, dates.length); i++) {
      const mx = mean(maxKeys.map((k) => d[k]?.[i]).filter((v): v is number => typeof v === "number"));
      const mn = mean(minKeys.map((k) => d[k]?.[i]).filter((v): v is number => typeof v === "number"));
      if (mx !== null && mn !== null) baselineTemps.push((mx + mn) / 2);
    }
    const refTemp = baselineTempMeanC ?? mean(baselineTemps);

    const days16to30: DailyForecastPoint[] = [];
    const series: ModelSeriesPoint[] = [];

    for (let idx = 15; idx < Math.min(30, dates.length); idx++) {
      const date = dates[idx];
      const dayIndex = idx + 1;

      const maxVals = maxKeys.map((k) => d[k]?.[idx]).filter((v): v is number => typeof v === "number");
      const minVals = minKeys.map((k) => d[k]?.[idx]).filter((v): v is number => typeof v === "number");
      const precipVals = precipKeys.map((k) => d[k]?.[idx]).filter((v): v is number => typeof v === "number");
      const windVals = windKeys.map((k) => d[k]?.[idx]).filter((v): v is number => typeof v === "number");
      const humVals = humKeys.map((k) => d[k]?.[idx]).filter((v): v is number => typeof v === "number");

      const tMax = mean(maxVals);
      const tMin = mean(minVals);
      const tMean = tMax !== null && tMin !== null ? (tMax + tMin) / 2 : null;
      const pMean = mean(precipVals);
      const wMean = mean(windVals);
      const hMean = mean(humVals);

      const rainProb =
        precipVals.length > 0
          ? Math.round((precipVals.filter((v) => v >= 1.0).length / precipVals.length) * 100)
          : null;
      const heavyRainProb =
        precipVals.length > 0
          ? Math.round((precipVals.filter((v) => v >= 15.0).length / precipVals.length) * 100)
          : null;

      const tempSpread = stdDev(maxVals);
      const precipSpread = stdDev(precipVals);
      const windSpread = stdDev(windVals);

      const tempAnomaly =
        tMean !== null && refTemp !== null ? Number((tMean - refTemp).toFixed(1)) : null;

      const tempTendency: "ABOVE_NORMAL" | "NEAR_NORMAL" | "BELOW_NORMAL" =
        tempAnomaly !== null && tempAnomaly >= 0.8
          ? "ABOVE_NORMAL"
          : tempAnomaly !== null && tempAnomaly <= -0.8
          ? "BELOW_NORMAL"
          : "NEAR_NORMAL";

      const rainTendency: "WETTER_THAN_NORMAL" | "NEAR_NORMAL" | "DRIER_THAN_NORMAL" =
        pMean !== null && pMean >= 6.0
          ? "WETTER_THAN_NORMAL"
          : pMean !== null && pMean <= 1.0
          ? "DRIER_THAN_NORMAL"
          : "NEAR_NORMAL";

      const windTendency: "BREEZY" | "NORMAL" | "CALM" =
        wMean !== null && wMean >= 25 ? "BREEZY" : wMean !== null && wMean <= 10 ? "CALM" : "NORMAL";

      // Approximate broad condition code from seasonal precipitation & humidity
      let weatherCode = 1;
      if (pMean !== null && pMean >= 12) weatherCode = 65;
      else if (pMean !== null && pMean >= 4) weatherCode = 61;
      else if (rainProb !== null && rainProb >= 45) weatherCode = 80;
      else if (hMean !== null && hMean >= 75) weatherCode = 2;

      const outlookSummary = [
        tempTendency === "ABOVE_NORMAL"
          ? "Warmer-than-recent tendency"
          : tempTendency === "BELOW_NORMAL"
          ? "Cooler-than-recent tendency"
          : "Near-normal temperatures",
        rainTendency === "WETTER_THAN_NORMAL"
          ? "elevated rainfall potential"
          : rainTendency === "DRIER_THAN_NORMAL"
          ? "mostly dry pattern"
          : "scattered shower possibility",
      ].join(", ");

      days16to30.push({
        date,
        dayIndex,
        horizonType: "extended_outlook",
        weatherCode,
        tempMin: tMin !== null ? Number(tMin.toFixed(1)) : null,
        tempMax: tMax !== null ? Number(tMax.toFixed(1)) : null,
        tempMean: tMean !== null ? Number(tMean.toFixed(1)) : null,
        rainProbability: rainProb,
        heavyRainProbability: heavyRainProb,
        precipitationSum: pMean !== null ? Number(pMean.toFixed(1)) : null,
        windSpeedMax: wMean !== null ? Number(wMean.toFixed(1)) : null,
        windDirectionDominant: null,
        humidityMean: hMean !== null ? Math.round(hMean) : null,
        cloudCoverMean: null,
        pressureMean: null,
        uvIndexMax: null,
        tempSpread: tempSpread !== null ? Number(tempSpread.toFixed(2)) : null,
        windSpread: windSpread !== null ? Number(windSpread.toFixed(2)) : null,
        precipSpread: precipSpread !== null ? Number(precipSpread.toFixed(2)) : null,
        confidence: dayIndex <= 20 && (tempSpread ?? 3) < 2.2 ? "MODERATE" : "LOW",
        confidenceReason:
          "Extended-range seasonal ensemble guidance (Days 16–30). Represents broad atmospheric tendencies, not deterministic hourly weather.",
        sourceModel: `ECMWF SEAS5 (${memberCount}-member Extended Ensemble)`,
        tempAnomaly,
        tempTendency,
        rainTendency,
        windTendency,
        outlookSummary,
      });

      series.push({
        time: `${date}T12:00`,
        temperature: tMean !== null ? Number(tMean.toFixed(1)) : null,
        precipitation: pMean !== null ? Number(pMean.toFixed(1)) : null,
        rainProbability: rainProb,
        windSpeed: wMean !== null ? Number(wMean.toFixed(1)) : null,
        cloudCover: null,
        pressure: null,
      });
    }

    return {
      provenance: {
        id: "extended_seas5",
        name: "ECMWF SEAS5 Extended-Range",
        provider: "ECMWF Seasonal Ensemble (via Open-Meteo)",
        status: days16to30.length > 0 ? "LIVE" : "PARTIAL",
        statusMessage: `Live ${memberCount}-member ECMWF SEAS5 extended-range ensemble outlook active for Days 16–30.`,
        documentationUrl: "https://www.ecmwf.int/en/forecasts/documentation-and-support/long-range",
        initializationTime: dates[0] ?? null,
        issueTime: retrievedAt,
        retrievedAt,
        spatialResolution: "1.0° (~100 km global seasonal grid)",
        temporalResolution: "Daily extended-range ensemble trend (no hourly breakdown)",
        forecastHorizon: "Days 16–30 (Extended Outlook)",
        ensembleMembers: memberCount,
      },
      days16to30,
      series,
    };
  } catch (err) {
    return {
      provenance: {
        id: "extended_seas5",
        name: "ECMWF SEAS5 Extended-Range",
        provider: "ECMWF Seasonal Ensemble",
        status: "ERROR",
        statusMessage: `Extended-range outlook unavailable: ${err instanceof Error ? err.message : "Unknown error"}`,
        documentationUrl: "https://www.ecmwf.int/en/forecasts/documentation-and-support/long-range",
        initializationTime: null,
        issueTime: null,
        retrievedAt,
        spatialResolution: "1.0° global grid",
        temporalResolution: "Daily trend",
        forecastHorizon: "Days 16–30",
        ensembleMembers: 51,
      },
      days16to30: [],
      series: [],
    };
  }
}
