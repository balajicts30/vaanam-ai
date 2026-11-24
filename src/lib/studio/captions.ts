import { formatRain, formatTemp, formatWind } from "@/lib/units";
import { getWeatherCodeInfo } from "@/lib/weather-codes";
import {
  ContentLanguage,
  RainfallUnit,
  TemperatureUnit,
  WeatherIntelligencePayload,
  WindUnit,
} from "@/types/weather";

export interface SocialCaptionInput {
  payload: WeatherIntelligencePayload;
  dayIndex: number; // 0 = today, 1 = tomorrow, etc.
  language: ContentLanguage;
  tempUnit: TemperatureUnit;
  windUnit: WindUnit;
  rainUnit: RainfallUnit;
}

export function generateFacebookCaption(input: SocialCaptionInput): {
  headline: string;
  caption: string;
  shortSummary: string;
} {
  const { payload, dayIndex, language, tempUnit, windUnit, rainUnit } = input;
  const city = payload.location.name;
  const state = payload.location.state || payload.location.country;
  const day = payload.daily30[dayIndex] || payload.daily30[0];
  const info = getWeatherCodeInfo(day?.weatherCode ?? payload.current.weatherCode);

  const tMin = formatTemp(day?.tempMin, tempUnit);
  const tMax = formatTemp(day?.tempMax, tempUnit);
  const rainProb = day?.rainProbability != null ? `${day.rainProbability}%` : "Low";
  const rainAmt = formatRain(day?.precipitationSum, rainUnit);
  const windStr = formatWind(day?.windSpeedMax, windUnit);
  const dayLabel = dayIndex === 0 ? "Today" : dayIndex === 1 ? "Tomorrow" : day?.date || "Upcoming";
  const dayLabelTa = dayIndex === 0 ? "இன்று" : dayIndex === 1 ? "நாளை" : day?.date || "வரும் நாள்";

  const cityTag = `#${city.replace(/[^a-zA-Z0-9]/g, "")}Weather`;
  const stateTag = state ? `#${state.replace(/[^a-zA-Z0-9]/g, "")}Weather` : "#IndiaWeather";

  const isRainy = (day?.rainProbability ?? 0) >= 45 || (day?.precipitationSum ?? 0) >= 3;
  const isHot = (day?.tempMax ?? 0) >= 36;

  const headline = isRainy
    ? `${info.emoji} Rain & Clouds Ahead for ${city}`
    : isHot
    ? `☀️ Warm Conditions Across ${city}`
    : `${info.emoji} ${info.label} Expected in ${city}`;

  const shortSummary = isRainy
    ? `${dayLabel} could bring ${info.label.toLowerCase()} with ${rainProb} rain probability (${rainAmt}) and temperatures between ${tMin} and ${tMax}.`
    : `${dayLabel} looks ${info.label.toLowerCase()} with temperatures ranging from ${tMin} to ${tMax} and peak winds near ${windStr}.`;

  const enCaption = `${info.emoji} ${city.toUpperCase()} WEATHER UPDATE (${day?.date ?? ""})

${headline}

${shortSummary}

🌡️ Temperature: ${tMin} – ${tMax}
🌧️ Rain Probability: ${rainProb} (ECMWF ENS 51-member data)
💧 Expected Rainfall: ${rainAmt}
💨 Peak Wind: ${windStr}
☁️ Conditions: ${info.label}
📊 Forecast Confidence: ${day?.confidence ?? "MODERATE"}

${isRainy ? "Planning to step out? Keep your umbrella handy!" : isHot ? "Stay hydrated and avoid peak afternoon heat." : "Have a safe and pleasant day ahead!"}

Data source: ECMWF IFS & ENS via VAANAM AI. For safety-critical alerts, always follow official IMD / local authority advisories.

${cityTag} ${stateTag} #WeatherUpdate #VaanamAI`;

  const taCaption = `${info.emoji} ${city} வானிலை அப்டேட் (${day?.date ?? ""})

${dayLabelTa} ${city} பகுதியில் ${info.labelTa} எதிர்பார்க்கப்படுகிறது.

🌡️ வெப்பநிலை: ${tMin} – ${tMax}
🌧️ மழை வாய்ப்பு: ${rainProb} (ECMWF ENS தரவு)
💧 எதிர்பார்க்கப்படும் மழை: ${rainAmt}
💨 காற்றின் வேகம்: ${windStr}
📊 கணிப்பு நம்பகத்தன்மை: ${day?.confidence ?? "MODERATE"}

${isRainy ? "வெளியே செல்லும்போது குடை எடுத்துச் செல்லவும்!" : "பாதுகாப்பாகவும் விழிப்புடனும் இருங்கள்."}

தரவு: ECMWF IFS & ENS • VAANAM AI. அதிகாரப்பூர்வ எச்சரிக்கைகளுக்கு IMD அறிவிப்புகளைப் பின்பற்றவும்.

${cityTag} #TamilNaduWeather #வானிலை #VaanamAI`;

  const caption =
    language === "ta"
      ? taCaption
      : language === "bilingual"
      ? `${enCaption}\n\n━━━━━━━━━━━━━━\n\n${taCaption}`
      : enCaption;

  return { headline, caption, shortSummary };
}
