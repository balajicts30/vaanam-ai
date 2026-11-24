import { ModelComparisonData, ModelSeriesPoint } from "@/types/weather";

interface ComparisonInput {
  ecmwf_ifs: ModelSeriesPoint[];
  ecmwf_ens: ModelSeriesPoint[];
  weathernext3: ModelSeriesPoint[];
  noaa_href: ModelSeriesPoint[];
  extended_seas5: ModelSeriesPoint[];
}

/**
 * Calculates inter-model agreement using comparable timestamps & variables
 * (temperature, precipitation, wind speed, cloud cover, pressure).
 * Explicitly notes that model agreement is NOT proof of forecast accuracy.
 */
export function buildModelComparison(input: ComparisonInput): ModelComparisonData {
  const activeModels: Array<{ name: string; series: ModelSeriesPoint[] }> = [];
  if (input.ecmwf_ifs.length > 0) activeModels.push({ name: "ECMWF IFS", series: input.ecmwf_ifs });
  if (input.ecmwf_ens.length > 0) activeModels.push({ name: "ECMWF ENS Mean", series: input.ecmwf_ens });
  if (input.weathernext3.length > 0) activeModels.push({ name: "WeatherNext 3", series: input.weathernext3 });
  if (input.noaa_href.length > 0) activeModels.push({ name: "NOAA HREF / HRRR", series: input.noaa_href });

  if (activeModels.length < 2) {
    return {
      agreementLevel: "INSUFFICIENT_DATA",
      agreementScore: null,
      agreementSummary:
        "Fewer than two overlapping short/medium-range models are currently active for this coordinate. Configure WeatherNext 3 credentials or select a US location for NOAA HREF to compare additional models.",
      comparedModels: activeModels.map((m) => m.name),
      comparableVariables: ["Temperature", "Precipitation", "Wind Speed", "Cloud Cover", "Pressure"],
      note: "Model agreement measures consistency between forecasting systems and is NOT proof of verified forecast accuracy.",
      series: input,
    };
  }

  // Align timestamps across active models for the first 72 hours
  const primary = activeModels[0].series.slice(0, 72);
  const secondaryList = activeModels.slice(1).map((m) => {
    const map = new Map<string, ModelSeriesPoint>();
    for (const pt of m.series) map.set(pt.time, pt);
    return map;
  });

  const tempDiffs: number[] = [];
  const precipDiffs: number[] = [];
  const windDiffs: number[] = [];

  for (const p of primary) {
    for (const sMap of secondaryList) {
      const s = sMap.get(p.time);
      if (!s) continue;
      if (p.temperature !== null && s.temperature !== null) {
        tempDiffs.push(Math.abs(p.temperature - s.temperature));
      }
      if (p.precipitation !== null && s.precipitation !== null) {
        precipDiffs.push(Math.abs(p.precipitation - s.precipitation));
      }
      if (p.windSpeed !== null && s.windSpeed !== null) {
        windDiffs.push(Math.abs(p.windSpeed - s.windSpeed));
      }
    }
  }

  const avgTempDiff = tempDiffs.length
    ? tempDiffs.reduce((a, b) => a + b, 0) / tempDiffs.length
    : 0;
  const avgPrecipDiff = precipDiffs.length
    ? precipDiffs.reduce((a, b) => a + b, 0) / precipDiffs.length
    : 0;
  const avgWindDiff = windDiffs.length
    ? windDiffs.reduce((a, b) => a + b, 0) / windDiffs.length
    : 0;

  // Score out of 100 based on mean absolute differences
  const tempPenalty = Math.min(45, avgTempDiff * 14);
  const precipPenalty = Math.min(35, avgPrecipDiff * 12);
  const windPenalty = Math.min(20, avgWindDiff * 2.5);
  const score = Math.max(5, Math.round(100 - tempPenalty - precipPenalty - windPenalty));

  let agreementLevel: "HIGH" | "MODERATE" | "LOW" = "MODERATE";
  let agreementSummary = "";

  if (score >= 78) {
    agreementLevel = "HIGH";
    agreementSummary = `Models show similar conditions over the next 72 hours (avg temperature diff ${avgTempDiff.toFixed(1)}°C, wind diff ${avgWindDiff.toFixed(1)} km/h, precip diff ${avgPrecipDiff.toFixed(2)} mm/h).`;
  } else if (score >= 55) {
    agreementLevel = "MODERATE";
    agreementSummary = `Models show some differences in timing or intensity (avg temperature diff ${avgTempDiff.toFixed(1)}°C, wind diff ${avgWindDiff.toFixed(1)} km/h, precip diff ${avgPrecipDiff.toFixed(2)} mm/h).`;
  } else {
    agreementLevel = "LOW";
    agreementSummary = `Models disagree significantly over the next 72 hours (avg temperature diff ${avgTempDiff.toFixed(1)}°C, precip diff ${avgPrecipDiff.toFixed(2)} mm/h). Expect forecast adjustments.`;
  }

  return {
    agreementLevel,
    agreementScore: score,
    agreementSummary,
    comparedModels: activeModels.map((m) => m.name),
    comparableVariables: [
      "Temperature (2m)",
      "Precipitation",
      "Wind Speed (10m)",
      "Rain Probability",
      "Cloud Cover",
      "Mean Sea-Level Pressure",
    ],
    note: "Model agreement reflects consensus among active numerical/ensemble systems and must NOT be treated as proof of forecast accuracy.",
    series: input,
  };
}
