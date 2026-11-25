import { formatHourLabel, formatRain, formatTemp, formatWind, windDirectionToCompass } from "@/lib/units";
import { getWeatherCodeInfo } from "@/lib/weather-codes";
import {
  ClockFormat,
  CurrentConditions,
  HourlyPoint,
  PulseStatusMode,
  RainViewerPayload,
  TimelineEvent,
  TimelineEventKind,
  UserSettings,
  WeatherIntelligencePayload,
  WeatherPulseSummary,
} from "@/types/weather";

/**
 * Format a Unix epoch (seconds) or ISO timestamp into the selected location's local time.
 */
export function formatTimeInTimezone(
  dateInput: Date | string | number,
  timezone: string,
  clockFormat: ClockFormat
): string {
  const dt =
    typeof dateInput === "number"
      ? new Date(dateInput * 1000)
      : typeof dateInput === "string"
      ? new Date(dateInput)
      : dateInput;

  if (Number.isNaN(dt.getTime())) {
    return typeof dateInput === "string" ? formatHourLabel(dateInput, clockFormat) : "—";
  }

  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: timezone && timezone !== "auto" ? timezone : undefined,
      hour: clockFormat === "24h" ? "2-digit" : "numeric",
      minute: "2-digit",
      hour12: clockFormat === "12h",
    }).format(dt);
  } catch {
    return new Intl.DateTimeFormat("en-US", {
      hour: clockFormat === "24h" ? "2-digit" : "numeric",
      minute: "2-digit",
      hour12: clockFormat === "12h",
    }).format(dt);
  }
}

/**
 * Format an Open-Meteo local time string ("YYYY-MM-DDTHH:MM") with exact minutes.
 */
export function formatLocalIsoTime(localIso: string, clockFormat: ClockFormat): string {
  const timePart = localIso.includes("T") ? localIso.split("T")[1] : localIso;
  const [hhStr, mmStr = "00"] = timePart.split(":");
  const hh = parseInt(hhStr, 10);
  const mm = mmStr.slice(0, 2).padStart(2, "0");
  if (Number.isNaN(hh)) return localIso;
  if (clockFormat === "24h") {
    return `${String(hh).padStart(2, "0")}:${mm}`;
  }
  const suffix = hh >= 12 ? "PM" : "AM";
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${h12}:${mm} ${suffix}`;
}

/**
 * Compute human-readable data freshness ("Just now", "4 min ago", etc.).
 */
export function formatDataFreshness(isoTimestamp: string): string {
  const ts = new Date(isoTimestamp).getTime();
  if (Number.isNaN(ts)) return "Live feed";
  const diffMin = Math.max(0, Math.round((Date.now() - ts) / 60000));
  if (diffMin <= 1) return "Updated just now";
  if (diffMin < 60) return `Updated ${diffMin} min ago`;
  const hrs = Math.round(diffMin / 60);
  return `Updated ${hrs}h ago`;
}

/**
 * Find the index in `hourly` corresponding to the current local hour in `current.time`.
 */
function findCurrentHourIndex(hourly: HourlyPoint[], currentTime: string): number {
  if (!hourly.length) return 0;
  // Open-Meteo current.time is e.g. "2026-11-24T18:45" and hourly.time is "2026-11-24T18:00"
  const currentHourPrefix = currentTime.slice(0, 13); // "YYYY-MM-DDTHH"
  const exactIdx = hourly.findIndex((h) => h.time.slice(0, 13) === currentHourPrefix);
  if (exactIdx >= 0) return exactIdx;

  // Fallback: first hourly entry >= currentHourPrefix lexicographically (valid for ISO local strings)
  const geIdx = hourly.findIndex((h) => h.time.slice(0, 13) >= currentHourPrefix);
  return geIdx >= 0 ? geIdx : 0;
}

function isRainCode(code: number): boolean {
  return (code >= 51 && code <= 67) || (code >= 80 && code <= 82);
}

function isHeavyRainCode(code: number): boolean {
  return code === 65 || code === 82;
}

function isThunderCode(code: number): boolean {
  return code >= 95;
}

function buildDetailsFromHour(h: HourlyPoint) {
  const info = getWeatherCodeInfo(h.weatherCode);
  return {
    temperature: h.temperature,
    feelsLike: h.feelsLike,
    rainProbability: h.rainProbability,
    precipitation: h.precipitation,
    windSpeed: h.windSpeed,
    windDirection: h.windDirection,
    cloudCover: h.cloudCover,
    pressure: h.pressure,
    humidity: h.humidity,
    weatherCode: h.weatherCode,
    weatherLabel: info.label,
  };
}

function buildDetailsFromCurrent(c: CurrentConditions) {
  const info = getWeatherCodeInfo(c.weatherCode);
  return {
    temperature: c.temperature,
    feelsLike: c.feelsLike,
    rainProbability: c.rainProbability,
    precipitation: c.precipitation,
    windSpeed: c.windSpeed,
    windDirection: c.windDirection,
    cloudCover: c.cloudCover,
    pressure: c.pressure,
    humidity: c.humidity,
    weatherCode: c.weatherCode,
    weatherLabel: info.label,
  };
}

/**
 * Dynamically generates the VAANAM AI Weather Pulse summary and chronological Upcoming Weather Timeline
 * strictly from real ECMWF IFS/ENS model data and (when available) RainViewer radar/nowcast metadata.
 *
 * Rules enforced:
 * - Never invents exact arrival times or fabricates events.
 * - Strictly separates radar observations / radar-based nowcast estimates from model forecasts.
 * - Avoids repetitive hour-by-hour noise; detects meaningful state transitions.
 * - Uses cautious wording whenever confidence is LOW or signal is model-only.
 */
export function buildWeatherPulse(
  payload: WeatherIntelligencePayload,
  radar: RainViewerPayload | null,
  settings: UserSettings,
  horizonHours: 3 | 6
): WeatherPulseSummary {
  const { location, current, hourly, retrievedAt, dataQuality } = payload;
  const tz = location.timezone || "UTC";
  const clock = settings.clockFormat;

  const freshnessLabel = formatDataFreshness(retrievedAt);
  const lastUpdatedLocal = formatTimeInTimezone(retrievedAt, tz, clock);

  const curIdx = findCurrentHourIndex(hourly, current.time);
  // Upcoming forecast hours: next 1..horizonHours (strictly future hours relative to current hour)
  const upcomingHours = hourly.slice(curIdx + 1, curIdx + 1 + horizonHours);
  const next6Hours = hourly.slice(curIdx + 1, curIdx + 7);

  // Determine real radar/nowcast availability
  const latestRadarPast =
    radar && radar.radarPast.length > 0
      ? radar.radarPast[radar.radarPast.length - 1]
      : null;
  const firstNowcast =
    radar && radar.radarNowcast.length > 0 ? radar.radarNowcast[0] : null;
  const latestNowcast =
    radar && radar.radarNowcast.length > 0
      ? radar.radarNowcast[radar.radarNowcast.length - 1]
      : null;

  const radarObservationTimeIso = latestRadarPast
    ? new Date(latestRadarPast.time * 1000).toISOString()
    : null;
  const radarObservationTimeLabel = latestRadarPast
    ? formatTimeInTimezone(latestRadarPast.time, tz, clock)
    : null;
  const radarFreshness = radar ? formatDataFreshness(radar.retrievedAt) : freshnessLabel;

  let statusMode: PulseStatusMode = "FORECAST";
  let statusLabel = "MODEL FORECAST";
  if (latestRadarPast && firstNowcast) {
    statusMode = "LIVE_RADAR";
    statusLabel = "LIVE RADAR + NOWCAST";
  } else if (firstNowcast) {
    statusMode = "NOWCAST";
    statusLabel = "NOWCAST ACTIVE";
  } else if (latestRadarPast) {
    statusMode = "LIVE_RADAR";
    statusLabel = "LIVE RADAR + MODEL";
  }

  const events: TimelineEvent[] = [];

  // Baseline current state for change detection — strictly driven by LIVE observed precipitation right now
  const curPrecip = current.precipitation ?? 0;
  const curClouds = current.cloudCover ?? 0;
  const curWind = current.windSpeed ?? 0;
  const curTemp = current.temperature;
  const curIsRaining = current.isRainingNow === true || curPrecip >= 0.15;
  const curIsThunder = curIsRaining && isThunderCode(current.weatherCode);

  // 1. Radar observation / nowcast event ONLY when supported by live RainViewer frames AND active/imminent precipitation
  const nextHour = upcomingHours[0];
  const nextHourRainLikely =
    nextHour &&
    ((nextHour.precipitation ?? 0) >= 0.3 ||
      (nextHour.rainProbability ?? 0) >= 50 ||
      isRainCode(nextHour.weatherCode) ||
      isThunderCode(nextHour.weatherCode));

  if (latestRadarPast && curIsRaining) {
    const isStorm = curIsThunder;
    const isHeavy = curPrecip >= 4 || isHeavyRainCode(current.weatherCode);
    events.push({
      id: `radar-obs-${latestRadarPast.time}`,
      kind: isStorm ? "thunderstorm" : isHeavy ? "heavy_rain" : "rain",
      headline: isStorm
        ? "ACTIVE THUNDERSTORM ACTIVITY"
        : isHeavy
        ? "HEAVY RAINFALL DETECTED"
        : "ACTIVE PRECIPITATION NEARBY",
      explanation: isStorm
        ? "Current observations and live radar frames indicate active convective storm cells in your area."
        : isHeavy
        ? `Active heavy rainfall (~${formatRain(curPrecip, settings.rainUnit)}/h) with live radar monitoring available.`
        : `Ongoing light to moderate rainfall (~${formatRain(curPrecip, settings.rainUnit)}/h) observed in current conditions.`,
      localTimeIso: radarObservationTimeIso || current.time,
      localTimeLabel: radarObservationTimeLabel || formatLocalIsoTime(current.time, clock),
      hoursAhead: 0,
      sourceType: "radar_observation",
      sourceProvider: "RainViewer Radar + Current Station/Model Analysis",
      forecastValidTime: current.time,
      observationTime: radarObservationTimeIso,
      confidence: "HIGH",
      dataFreshness: radarFreshness,
      priority: isStorm ? 100 : isHeavy ? 95 : 85,
      radarRelevant: true,
      details: buildDetailsFromCurrent(current),
    });
  } else if (latestNowcast && !curIsRaining && nextHourRainLikely) {
    // Imminent precipitation within nowcast window supported by next-hour model signal + live RainViewer nowcast frames
    const nowcastTimeLabel = formatTimeInTimezone(latestNowcast.time, tz, clock);
    const nowcastIso = new Date(latestNowcast.time * 1000).toISOString();
    const prob = nextHour?.rainProbability ?? null;
    events.push({
      id: `radar-nowcast-${latestNowcast.time}`,
      kind: isThunderCode(nextHour.weatherCode) ? "thunderstorm" : "rain",
      headline: isThunderCode(nextHour.weatherCode)
        ? "POSSIBLE STORM CELLS APPROACHING"
        : "POSSIBLE RAIN ARRIVAL",
      explanation:
        prob !== null
          ? `Radar nowcast window and short-range guidance suggest possible rainfall (${prob}% probability).`
          : "Radar nowcast window and short-range guidance suggest approaching precipitation.",
      localTimeIso: nowcastIso,
      localTimeLabel: nowcastTimeLabel,
      hoursAhead: 0.5,
      sourceType: "radar_estimate",
      sourceProvider: "RainViewer Nowcast + ECMWF Short-Range",
      forecastValidTime: nowcastIso,
      observationTime: radarObservationTimeIso,
      confidence: prob !== null && prob >= 65 ? "HIGH" : "MODERATE",
      dataFreshness: radarFreshness,
      priority: isThunderCode(nextHour.weatherCode) ? 96 : 88,
      radarRelevant: true,
      details: buildDetailsFromHour(nextHour),
    });
  }

  // 2. Scan upcoming hours (ECMWF IFS 0.25° + ECMWF ENS 51-member) for meaningful transitions
  let prevPrecip = curPrecip;
  let prevClouds = curClouds;
  let prevWind = curWind;
  let prevRaining = curIsRaining;
  let prevHeavy = curPrecip >= 4 || isHeavyRainCode(current.weatherCode);
  let prevThunder = curIsThunder;

  // Deduplication flags so we don't spam repetitive events
  let addedRainStart = events.some((e) => e.kind === "rain" && e.sourceType === "radar_estimate");
  let addedHeavyRain = false;
  let addedRainEasing = false;
  let addedThunder = events.some((e) => e.kind === "thunderstorm");
  let addedWind = false;
  let addedCloudChange = false;
  let addedTempChange = false;
  let addedClearing = false;

  const modelProviderLabel = "ECMWF IFS 0.25° + ENS 51";

  for (let i = 0; i < upcomingHours.length; i++) {
    const h = upcomingHours[i];
    const hoursAhead = i + 1;
    const localTimeLabel = formatLocalIsoTime(h.time, clock);
    const precip = h.precipitation ?? 0;
    const rainProb = h.rainProbability ?? 0;
    const clouds = h.cloudCover ?? prevClouds;
    const wind = h.windSpeed ?? prevWind;
    const conf = h.confidence;
    const cautious = conf === "LOW";

    const isThunder = isThunderCode(h.weatherCode);
    const isHeavy = precip >= 4.0 || isHeavyRainCode(h.weatherCode) || (h.heavyRainProb ?? 0) >= 40;
    const isRaining = precip >= 0.3 || isRainCode(h.weatherCode) || (rainProb >= 55 && precip >= 0.1);

    // Priority A: Thunderstorm development
    if (isThunder && !prevThunder && !addedThunder) {
      events.push({
        id: `model-thunder-${h.time}`,
        kind: "thunderstorm",
        headline: cautious ? "THUNDERSTORM POSSIBLE" : "THUNDERSTORM DEVELOPMENT",
        explanation: cautious
          ? "Short-range model hints at possible thunderstorm activity with gusty winds."
          : `Short-range model indicates thunderstorm risk (${rainProb}% rain probability, ~${formatRain(precip, settings.rainUnit)}/h).`,
        localTimeIso: h.time,
        localTimeLabel,
        hoursAhead,
        sourceType: "model_forecast",
        sourceProvider: modelProviderLabel,
        forecastValidTime: h.time,
        observationTime: null,
        confidence: conf,
        dataFreshness: freshnessLabel,
        priority: 98,
        radarRelevant: true,
        details: buildDetailsFromHour(h),
      });
      addedThunder = true;
      prevThunder = true;
      prevRaining = true;
      prevPrecip = precip;
      prevClouds = clouds;
      prevWind = wind;
      continue;
    }

    // Priority B: Rain intensifying / Heavy rain
    if (isHeavy && !prevHeavy && !addedHeavyRain) {
      events.push({
        id: `model-heavy-${h.time}`,
        kind: "heavy_rain",
        headline: prevRaining ? "SHOWERS MAY INTENSIFY" : "HEAVY RAIN POSSIBLE",
        explanation: cautious
          ? `Model guidance suggests rainfall could briefly intensify (~${formatRain(precip, settings.rainUnit)}/h).`
          : `Short-range model indicates heavier rainfall around ${formatRain(precip, settings.rainUnit)}/h (${rainProb}% probability).`,
        localTimeIso: h.time,
        localTimeLabel,
        hoursAhead,
        sourceType: "model_forecast",
        sourceProvider: modelProviderLabel,
        forecastValidTime: h.time,
        observationTime: null,
        confidence: conf,
        dataFreshness: freshnessLabel,
        priority: 92,
        radarRelevant: true,
        details: buildDetailsFromHour(h),
      });
      addedHeavyRain = true;
      prevHeavy = true;
      prevRaining = true;
      prevPrecip = precip;
      prevClouds = clouds;
      prevWind = wind;
      continue;
    }

    // Priority C: Rain starting (when not previously raining)
    if (isRaining && !prevRaining && !addedRainStart) {
      events.push({
        id: `model-rain-start-${h.time}`,
        kind: "rain",
        headline: cautious || rainProb < 60 ? "POSSIBLE RAIN ARRIVAL" : "RAIN LIKELY TO BEGIN",
        explanation:
          cautious || rainProb < 60
            ? `Short-range forecast suggests a ${rainProb}% chance of light showers developing.`
            : `Model guidance shows rainfall starting (~${formatRain(precip, settings.rainUnit)}/h, ${rainProb}% probability).`,
        localTimeIso: h.time,
        localTimeLabel,
        hoursAhead,
        sourceType: "model_forecast",
        sourceProvider: modelProviderLabel,
        forecastValidTime: h.time,
        observationTime: null,
        confidence: conf,
        dataFreshness: freshnessLabel,
        priority: 86,
        radarRelevant: true,
        details: buildDetailsFromHour(h),
      });
      addedRainStart = true;
      prevRaining = true;
      prevPrecip = precip;
      prevClouds = clouds;
      prevWind = wind;
      continue;
    }

    // Priority D: Rain intensifying significantly even below heavy threshold (+1.5mm jump)
    if (prevRaining && isRaining && precip - prevPrecip >= 1.5 && !addedHeavyRain) {
      events.push({
        id: `model-rain-intensify-${h.time}`,
        kind: "heavy_rain",
        headline: "SHOWERS MAY INTENSIFY",
        explanation: `Short-range model indicates rainfall increasing toward ${formatRain(precip, settings.rainUnit)}/h.`,
        localTimeIso: h.time,
        localTimeLabel,
        hoursAhead,
        sourceType: "model_forecast",
        sourceProvider: modelProviderLabel,
        forecastValidTime: h.time,
        observationTime: null,
        confidence: conf,
        dataFreshness: freshnessLabel,
        priority: 84,
        radarRelevant: true,
        details: buildDetailsFromHour(h),
      });
      addedHeavyRain = true;
      prevPrecip = precip;
      prevClouds = clouds;
      prevWind = wind;
      continue;
    }

    // Priority E: Rain easing / weakening
    if (
      prevRaining &&
      !addedRainEasing &&
      (!isRaining || (prevPrecip >= 1.0 && precip <= prevPrecip * 0.45))
    ) {
      events.push({
        id: `model-rain-ease-${h.time}`,
        kind: !isRaining && clouds < 55 ? "clearing" : "rain",
        headline: !isRaining ? "RAIN MAY TAPER OFF" : "RAIN MAY WEAKEN",
        explanation: !isRaining
          ? "Precipitation activity is forecast to gradually subside over this period."
          : "Rainfall intensity may gradually reduce compared to earlier hours.",
        localTimeIso: h.time,
        localTimeLabel,
        hoursAhead,
        sourceType: "model_forecast",
        sourceProvider: modelProviderLabel,
        forecastValidTime: h.time,
        observationTime: null,
        confidence: conf,
        dataFreshness: freshnessLabel,
        priority: 76,
        radarRelevant: true,
        details: buildDetailsFromHour(h),
      });
      addedRainEasing = true;
      prevRaining = isRaining;
      prevHeavy = isHeavy;
      prevPrecip = precip;
      prevClouds = clouds;
      prevWind = wind;
      continue;
    }

    // Priority F: Wind strengthening (>= 28 km/h and +8 km/h jump, or >= 35 km/h)
    if (!addedWind && ((wind >= 28 && wind - curWind >= 8) || (wind >= 35 && curWind < 30))) {
      const dir = windDirectionToCompass(h.windDirection);
      events.push({
        id: `model-wind-${h.time}`,
        kind: "wind",
        headline: "WINDS STRENGTHENING",
        explanation: `Breezy conditions expected with winds near ${formatWind(wind, settings.windUnit)} from the ${dir}.`,
        localTimeIso: h.time,
        localTimeLabel,
        hoursAhead,
        sourceType: "model_forecast",
        sourceProvider: modelProviderLabel,
        forecastValidTime: h.time,
        observationTime: null,
        confidence: conf,
        dataFreshness: freshnessLabel,
        priority: 74,
        radarRelevant: false,
        details: buildDetailsFromHour(h),
      });
      addedWind = true;
    }

    // Priority G: Cloud cover increasing significantly (+25% jump into >= 65%)
    if (!addedCloudChange && clouds >= 65 && clouds - curClouds >= 25 && !isRaining) {
      events.push({
        id: `model-clouds-up-${h.time}`,
        kind: "clouds",
        headline: "CLOUDS INCREASING",
        explanation: `Cloud cover is expected to build toward ${Math.round(clouds)}% across the area.`,
        localTimeIso: h.time,
        localTimeLabel,
        hoursAhead,
        sourceType: "model_forecast",
        sourceProvider: modelProviderLabel,
        forecastValidTime: h.time,
        observationTime: null,
        confidence: conf,
        dataFreshness: freshnessLabel,
        priority: 62,
        radarRelevant: true,
        details: buildDetailsFromHour(h),
      });
      addedCloudChange = true;
    }

    // Priority H: Clearing skies (cloud cover dropping by >= 25% down to <= 35%)
    if (!addedClearing && !isRaining && curClouds >= 60 && clouds <= 35 && curClouds - clouds >= 25) {
      events.push({
        id: `model-clearing-${h.time}`,
        kind: "clearing",
        headline: "SKIES CLEARING",
        explanation: `Cloud cover is forecast to thin out to around ${Math.round(clouds)}%, bringing clearer skies.`,
        localTimeIso: h.time,
        localTimeLabel,
        hoursAhead,
        sourceType: "model_forecast",
        sourceProvider: modelProviderLabel,
        forecastValidTime: h.time,
        observationTime: null,
        confidence: conf,
        dataFreshness: freshnessLabel,
        priority: 60,
        radarRelevant: false,
        details: buildDetailsFromHour(h),
      });
      addedClearing = true;
    }

    // Priority I: Significant temperature shift (>= 3.5°C change from current)
    if (!addedTempChange && curTemp !== null && h.temperature !== null) {
      const delta = h.temperature - curTemp;
      if (Math.abs(delta) >= 3.5) {
        const warming = delta > 0;
        events.push({
          id: `model-temp-${h.time}`,
          kind: "temperature",
          headline: warming ? "TEMPERATURES RISING" : "TEMPERATURES COOLING",
          explanation: warming
            ? `Temperatures are projected to climb toward ${formatTemp(h.temperature, settings.tempUnit)}.`
            : `Conditions are expected to cool down toward ${formatTemp(h.temperature, settings.tempUnit)}.`,
          localTimeIso: h.time,
          localTimeLabel,
          hoursAhead,
          sourceType: "model_forecast",
          sourceProvider: modelProviderLabel,
          forecastValidTime: h.time,
          observationTime: null,
          confidence: conf,
          dataFreshness: freshnessLabel,
          priority: 58,
          radarRelevant: false,
          details: buildDetailsFromHour(h),
        });
        addedTempChange = true;
      }
    }

    prevPrecip = precip;
    prevClouds = clouds;
    prevWind = wind;
    prevRaining = isRaining;
    prevHeavy = isHeavy;
    prevThunder = isThunder;
  }

  // Sort strictly chronologically by hoursAhead
  events.sort((a, b) => a.hoursAhead - b.hoursAhead);

  // Aggregate next-6h expected rainfall & peak rain probability
  const expectedRainNext6hMm = Number(
    next6Hours.reduce((sum, h) => sum + (h.precipitation ?? 0), 0).toFixed(1)
  );
  const rainProbs = next6Hours
    .map((h) => h.rainProbability)
    .filter((v): v is number => v !== null && v !== undefined);
  const maxRainProbNext6h =
    rainProbs.length > 0 ? Math.max(...rainProbs) : current.rainProbability;

  // Build Main Weather Pulse Headline strictly anchored to PRESENT LIVE CLIMATE FEEL.
  // If it is shining/dry right now, the live headline MUST show the present dry/shining sky —
  // never overriding live sunshine with a later forecast rain alert!
  const topEvent = [...events].sort((a, b) => b.priority - a.priority)[0] ?? null;
  const curInfo = getWeatherCodeInfo(current.weatherCode);

  let headline =
    !curIsRaining
      ? current.isDay && curClouds <= 30
        ? "Shining & Dry Right Now"
        : curClouds <= 65
        ? `${curInfo.label} & Dry Right Now`
        : "Overcast & Dry Right Now"
      : curIsThunder
      ? "Active Thunderstorm Right Now"
      : curPrecip >= 4
      ? "Heavy Rainfall Active Right Now"
      : "Rainfall Active Right Now";

  let arrivalEstimate: string | null = !curIsRaining
    ? "Live Now: 0.0 mm observed"
    : `Live Now: ~${formatRain(curPrecip, settings.rainUnit)}/h`;

  let explanation = !curIsRaining
    ? current.liveObservationNote ||
      `${location.name} is currently dry with ${curInfo.label.toLowerCase()} skies (${curClouds}% cloud cover). Upcoming model forecasts are listed separately in the Forecast Timeline below.`
    : `Active precipitation (~${formatRain(curPrecip, settings.rainUnit)}/h) is currently observed over ${location.name}.`;

  let actionRecommendation = !curIsRaining
    ? current.isDay && curClouds <= 35
      ? "Clear, bright conditions right now — great for stepping outdoors. Check the Forecast Timeline below for later hours."
      : "Dry right now — check the Forecast Timeline below for any changes later today."
    : "Carry rain protection right now and track moving cells on Live Radar.";

  let dominantKind: TimelineEventKind | "steady" = curIsRaining
    ? curIsThunder
      ? "thunderstorm"
      : curPrecip >= 4
      ? "heavy_rain"
      : "rain"
    : "steady";

  // If dry right now, optionally add a clearly labeled forecast-only note without overriding the live sky headline
  if (!curIsRaining && topEvent && topEvent.hoursAhead > 0) {
    if (topEvent.kind === "rain" || topEvent.kind === "heavy_rain" || topEvent.kind === "thunderstorm") {
      arrivalEstimate = `Dry now • Forecast later (~${topEvent.hoursAhead}h, near ${topEvent.localTimeLabel})`;
    }
  } else if (curIsRaining && topEvent && topEvent.hoursAhead === 0) {
    dominantKind = topEvent.kind;
    explanation = topEvent.explanation;
  }

  return {
    statusMode,
    statusLabel,
    headline,
    arrivalEstimate,
    explanation,
    actionRecommendation,
    dominantKind,
    expectedRainNext6hMm,
    maxRainProbNext6h,
    confidence: dataQuality.overallConfidence,
    lastUpdatedLocal,
    dataFreshnessLabel: freshnessLabel,
    radarObservationTimeLabel,
    events,
  };
}

/**
 * Selects up to `maxCount` (default 4) most significant events for the 1080x1350 PNG share card,
 * preserving chronological order so the graphic stays clean and readable.
 */
export function selectTopTimelineEvents(events: TimelineEvent[], maxCount = 4): TimelineEvent[] {
  if (events.length <= maxCount) return events;
  const topIds = new Set(
    [...events]
      .sort((a, b) => b.priority - a.priority)
      .slice(0, maxCount)
      .map((e) => e.id)
  );
  return events.filter((e) => topIds.has(e.id));
}
