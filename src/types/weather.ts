export type TemperatureUnit = "C" | "F";
export type WindUnit = "kmh" | "ms";
export type RainfallUnit = "mm" | "in";
export type ClockFormat = "12h" | "24h";
export type ContentLanguage = "en" | "ta" | "bilingual";

export type NavSection =
  | "dashboard"
  | "forecast-30"
  | "forecast-week"
  | "forecast-hour"
  | "models"
  | "radar"
  | "maps"
  | "analyst"
  | "studio"
  | "settings";

export interface GeoLocation {
  id: string;
  name: string;
  district?: string;
  state?: string;
  country: string;
  countryCode?: string;
  latitude: number;
  longitude: number;
  timezone: string;
  elevation?: number;
  postalCode?: string;
  source: "geolocation" | "search" | "coordinates" | "preset" | "favourite";
}

export type ProviderStatus =
  | "LIVE"
  | "CREDENTIALS_REQUIRED"
  | "UNAVAILABLE_OUTSIDE_COVERAGE"
  | "ERROR"
  | "PARTIAL";

export interface ModelProvenance {
  id: "weathernext3" | "ecmwf_ens" | "ecmwf_ifs" | "noaa_href" | "extended_seas5";
  name: string;
  provider: string;
  status: ProviderStatus;
  statusMessage: string;
  documentationUrl: string;
  initializationTime: string | null;
  issueTime: string | null;
  retrievedAt: string;
  spatialResolution: string;
  temporalResolution: string;
  forecastHorizon: string;
  ensembleMembers: number | null;
  setupRequirement?: string;
}

export interface CurrentConditions {
  time: string;
  temperature: number | null;
  feelsLike: number | null;
  dewPoint: number | null;
  humidity: number | null;
  precipitation: number | null;
  rainProbability: number | null;
  windSpeed: number | null;
  windDirection: number | null;
  windGusts: number | null;
  pressure: number | null;
  cloudCover: number | null;
  solarRadiation: number | null;
  uvIndex: number | null;
  weatherCode: number;
  isDay: boolean;
  isRainingNow?: boolean;
  liveObservationNote?: string;
  sourceModel: string;
}

export interface HourlyPoint {
  time: string;
  temperature: number | null;
  feelsLike: number | null;
  dewPoint: number | null;
  humidity: number | null;
  precipitation: number | null;
  rainProbability: number | null;
  windSpeed: number | null;
  windDirection: number | null;
  pressure: number | null;
  cloudCover: number | null;
  solarRadiation: number | null;
  uvIndex: number | null;
  weatherCode: number;
  // Ensemble statistics (from ECMWF ENS 51 members)
  tempSpread?: number | null;
  tempMin?: number | null;
  tempMax?: number | null;
  precipSpread?: number | null;
  heavyRainProb?: number | null;
  confidence: "HIGH" | "MODERATE" | "LOW";
}

export interface DailyForecastPoint {
  date: string;
  dayIndex: number; // 1..30
  horizonType: "short_medium" | "extended_outlook";
  weatherCode: number;
  tempMin: number | null;
  tempMax: number | null;
  tempMean: number | null;
  rainProbability: number | null;
  heavyRainProbability: number | null;
  precipitationSum: number | null;
  windSpeedMax: number | null;
  windDirectionDominant: number | null;
  humidityMean: number | null;
  cloudCoverMean: number | null;
  pressureMean: number | null;
  uvIndexMax: number | null;
  // Ensemble spread
  tempSpread: number | null;
  windSpread: number | null;
  precipSpread: number | null;
  confidence: "HIGH" | "MODERATE" | "LOW";
  confidenceReason: string;
  sourceModel: string;
  // Extended-range specific (Days 16-30)
  tempAnomaly?: number | null;
  tempTendency?: "ABOVE_NORMAL" | "NEAR_NORMAL" | "BELOW_NORMAL" | null;
  rainTendency?: "WETTER_THAN_NORMAL" | "NEAR_NORMAL" | "DRIER_THAN_NORMAL" | null;
  windTendency?: "BREEZY" | "NORMAL" | "CALM" | null;
  outlookSummary?: string | null;
}

export interface ModelSeriesPoint {
  time: string;
  temperature: number | null;
  precipitation: number | null;
  rainProbability: number | null;
  windSpeed: number | null;
  cloudCover: number | null;
  pressure: number | null;
}

export interface ModelComparisonData {
  agreementLevel: "HIGH" | "MODERATE" | "LOW" | "INSUFFICIENT_DATA";
  agreementScore: number | null; // 0..100
  agreementSummary: string;
  comparedModels: string[];
  comparableVariables: string[];
  note: string;
  series: {
    ecmwf_ifs: ModelSeriesPoint[];
    ecmwf_ens: ModelSeriesPoint[];
    weathernext3: ModelSeriesPoint[];
    noaa_href: ModelSeriesPoint[];
    extended_seas5: ModelSeriesPoint[];
  };
}

export interface WeatherAlert {
  id: string;
  origin: "OFFICIAL_IMD" | "OFFICIAL_NWS" | "AI_RISK_INDICATOR";
  severity: "INFO" | "MODERATE" | "SEVERE" | "EXTREME";
  category:
    | "HEAVY_RAIN"
    | "THUNDERSTORM"
    | "STRONG_WIND"
    | "HEATWAVE"
    | "TEMP_DROP"
    | "CYCLONE"
    | "MODEL_SHIFT"
    | "OFFICIAL_WARNING";
  title: string;
  description: string;
  validFrom?: string;
  validTo?: string;
  source: string;
  url?: string;
}

export interface WeatherIntelligencePayload {
  location: GeoLocation;
  retrievedAt: string;
  current: CurrentConditions;
  hourly: HourlyPoint[];
  daily30: DailyForecastPoint[];
  models: ModelProvenance[];
  comparison: ModelComparisonData;
  alerts: WeatherAlert[];
  dataQuality: {
    liveSourcesCount: number;
    totalSourcesCount: number;
    degradedSources: { name: string; reason: string }[];
    lastSuccessfulUpdate: string;
    overallConfidence: "HIGH" | "MODERATE" | "LOW";
  };
}

export interface AiAnalystReport {
  generatedBy: "GEMINI_AI" | "DETERMINISTIC_DATA_ENGINE";
  modelUsed: string;
  language: ContentLanguage;
  generatedAt: string;
  currentExplanation: string;
  dailyBriefing: string;
  weeklyBriefing: string;
  outlook30Day: string;
  keyTakeaways: string[];
  headline: string;
  disclaimer: string;
}

export type StoryThemeId =
  | "cinematic"
  | "minimal-news"
  | "tropical-monsoon"
  | "storm-tracker"
  | "sunrise-sunset"
  | "futuristic-radar"
  | "premium-editorial"
  | "dark-atmospheric"
  | "bright-summer"
  | "coastal-weather";

export interface RainViewerPayload {
  host: string;
  generated: number;
  radarPast: Array<{ time: number; path: string }>;
  radarNowcast: Array<{ time: number; path: string }>;
  satelliteInfrared: Array<{ time: number; path: string }>;
  retrievedAt: string;
}

export type TimelineEventKind =
  | "clouds"
  | "rain"
  | "heavy_rain"
  | "thunderstorm"
  | "wind"
  | "temperature"
  | "clearing";

export type TimelineSourceType =
  | "radar_observation"
  | "radar_estimate"
  | "model_forecast";

export type PulseStatusMode = "LIVE_RADAR" | "NOWCAST" | "FORECAST";

export interface TimelineEvent {
  id: string;
  kind: TimelineEventKind;
  headline: string;
  explanation: string;
  /** Local ISO-like timestamp (YYYY-MM-DDTHH:MM) or ISO string */
  localTimeIso: string;
  /** Display time formatted in the selected location's local timezone */
  localTimeLabel: string;
  /** Forecast hour offset from current time (0 = current/nowcast, 1..6 = hours ahead) */
  hoursAhead: number;
  sourceType: TimelineSourceType;
  sourceProvider: string;
  forecastValidTime: string;
  observationTime: string | null;
  confidence: "HIGH" | "MODERATE" | "LOW";
  dataFreshness: string;
  /** Priority score (higher = more significant, used for PNG top 3-4 selection) */
  priority: number;
  /** Whether opening the Live Radar view is relevant for this event */
  radarRelevant: boolean;
  /** Underlying forecast metrics for interactive inspection */
  details: {
    temperature: number | null;
    feelsLike: number | null;
    rainProbability: number | null;
    precipitation: number | null;
    windSpeed: number | null;
    windDirection: number | null;
    cloudCover: number | null;
    pressure: number | null;
    humidity: number | null;
    weatherCode: number;
    weatherLabel: string;
  };
}

export interface WeatherPulseSummary {
  statusMode: PulseStatusMode;
  statusLabel: string;
  headline: string;
  arrivalEstimate: string | null;
  explanation: string;
  actionRecommendation: string;
  dominantKind: TimelineEventKind | "steady";
  expectedRainNext6hMm: number;
  maxRainProbNext6h: number | null;
  confidence: "HIGH" | "MODERATE" | "LOW";
  lastUpdatedLocal: string;
  dataFreshnessLabel: string;
  radarObservationTimeLabel: string | null;
  events: TimelineEvent[];
}

export interface WeatherGridNode {
  lat: number;
  lon: number;
  temperature: number | null;
  precipitation: number | null;
  cloudCover: number | null;
  windSpeed: number | null;
  windDirection: number | null;
  pressure: number | null;
}

export interface UserSettings {
  defaultLocation: GeoLocation | null;
  favourites: GeoLocation[];
  tempUnit: TemperatureUnit;
  windUnit: WindUnit;
  rainUnit: RainfallUnit;
  clockFormat: ClockFormat;
  preferredTheme: StoryThemeId;
  contentLanguage: ContentLanguage;
  autoDetectLocation: boolean;
  refreshIntervalMinutes: number;
  alertsEnabled: {
    heavyRain: boolean;
    thunderstorm: boolean;
    strongWind: boolean;
    heatwave: boolean;
    modelShift: boolean;
  };
}
