import { getWeatherCodeInfo } from "@/lib/weather-codes";
import { AiAnalystReport, ContentLanguage, WeatherIntelligencePayload } from "@/types/weather";

const DISCLAIMER =
  "Weather forecasts are model-based predictions and may change. Extended-range outlooks are less certain than short-range forecasts. This platform is intended for informational purposes and does not replace official meteorological warnings. Follow IMD and local authorities for safety-critical decisions.";

function buildDeterministicReport(
  payload: WeatherIntelligencePayload,
  language: ContentLanguage
): AiAnalystReport {
  const { location, current, daily30, alerts } = payload;
  const curInfo = getWeatherCodeInfo(current.weatherCode);
  const tomorrow = daily30[1] || daily30[0];
  const tomInfo = getWeatherCodeInfo(tomorrow?.weatherCode ?? 2);
  const week1 = daily30.slice(0, 7);
  const ext16to30 = daily30.slice(15, 30);

  const wettestDay = week1.reduce(
    (best, d) => ((d.precipitationSum ?? 0) > (best.precipitationSum ?? 0) ? d : best),
    week1[0]
  );
  const hottestDay = week1.reduce(
    (best, d) => ((d.tempMax ?? -99) > (best.tempMax ?? -99) ? d : best),
    week1[0]
  );
  const weekRainDays = week1.filter((d) => (d.rainProbability ?? 0) >= 40 || (d.precipitationSum ?? 0) >= 2).length;
  const avgWind =
    week1.reduce((s, d) => s + (d.windSpeedMax ?? 0), 0) / Math.max(week1.length, 1);

  const extWetDays = ext16to30.filter((d) => d.rainTendency === "WETTER_THAN_NORMAL").length;
  const extWarmDays = ext16to30.filter((d) => d.tempTendency === "ABOVE_NORMAL").length;
  const extCoolDays = ext16to30.filter((d) => d.tempTendency === "BELOW_NORMAL").length;

  const curTemp = current.temperature !== null ? `${current.temperature.toFixed(1)}°C` : "unavailable";
  const curHum = current.humidity !== null ? `${current.humidity}%` : "moderate";
  const curCloud = current.cloudCover !== null ? `${current.cloudCover}%` : "variable";
  const curWind = current.windSpeed !== null ? `${Math.round(current.windSpeed)} km/h` : "light";

  const enCurrent = `${location.name} is currently experiencing ${curInfo.label.toLowerCase()} conditions at ${curTemp} with ${curHum} humidity and ${curCloud} cloud cover. Winds are blowing around ${curWind}.${
    (current.rainProbability ?? 0) >= 40
      ? ` Ensemble data indicates a ${current.rainProbability}% chance of showers in the near term.`
      : " Immediate rainfall risk remains low based on current model observations."
  }`;

  const enDaily = tomorrow
    ? `Tomorrow in ${location.name} looks ${tomInfo.label.toLowerCase()}, with temperatures ranging between ${
        tomorrow.tempMin?.toFixed(0) ?? "—"
      }°C and ${tomorrow.tempMax?.toFixed(0) ?? "—"}°C. Rain probability stands at ${
        tomorrow.rainProbability ?? 0
      }% with expected rainfall near ${(tomorrow.precipitationSum ?? 0).toFixed(1)} mm.${
        (tomorrow.rainProbability ?? 0) >= 45
          ? " Keep an umbrella handy if you are stepping outdoors."
          : " Outdoor plans look largely manageable."
      }`
    : "Daily forecast details are currently updating.";

  const enWeekly = `Over the next 7 days in ${location.name}, ${
    weekRainDays >= 4
      ? "expect a relatively wet pattern with multiple shower windows"
      : weekRainDays >= 2
      ? "expect a mix of sunny intervals and scattered rain spells"
      : "expect mostly dry and settled weather"
  }. The warmest day is projected around ${hottestDay?.date ?? "mid-week"} (${
    hottestDay?.tempMax?.toFixed(1) ?? "—"
  }°C), while the highest rainfall potential is on ${wettestDay?.date ?? "the wettest day"} (${(
    wettestDay?.precipitationSum ?? 0
  ).toFixed(1)} mm). Peak daily winds average around ${Math.round(avgWind)} km/h.`;

  const en30Day =
    ext16to30.length > 0
      ? `For Days 16–30 (ECMWF SEAS5 Extended-Range Outlook), ${location.name} shows ${
          extWarmDays > extCoolDays + 3
            ? "a warmer-than-recent temperature tendency"
            : extCoolDays > extWarmDays + 3
            ? "a slightly cooler-than-recent temperature tendency"
            : "mostly near-normal seasonal temperatures"
        }, with ${
          extWetDays >= 5
            ? "several wetter-than-normal spells possible"
            : "predominantly dry to near-normal rainfall tendencies"
        }. Because extended-range guidance captures broad atmospheric patterns rather than exact daily storms, confidence is lower than in the 1–7 day window.`
      : "Extended-range Days 16–30 seasonal data is currently unavailable from the upstream provider.";

  const taCurrent = `${location.name} பகுதியில் தற்போது ${curInfo.labelTa} நிலவுகிறது. வெப்பநிலை ${curTemp}, ஈரப்பதம் ${curHum}, மேகமூட்டம் ${curCloud} மற்றும் காற்றின் வேகம் சுமார் ${curWind} ஆக உள்ளது.`;
  const taDaily = tomorrow
    ? `நாளை ${location.name} பகுதியில் ${tomInfo.labelTa} எதிர்பார்க்கப்படுகிறது. குறைந்தபட்ச வெப்பநிலை ${
        tomorrow.tempMin?.toFixed(0) ?? "—"
      }°C, அதிகபட்ச வெப்பநிலை ${tomorrow.tempMax?.toFixed(0) ?? "—"}°C. மழை வாய்ப்பு ${
        tomorrow.rainProbability ?? 0
      }% (${(tomorrow.precipitationSum ?? 0).toFixed(1)} மி.மீ).`
    : "நாளைய வானிலை தகவல் புதுப்பிக்கப்படுகிறது.";
  const taWeekly = `அடுத்த 7 நாட்களில் ${location.name} பகுதியில் ${
    weekRainDays >= 3 ? "பல நாட்களில் மழை பெய்ய வாய்ப்புள்ளது" : "பெரும்பாலும் வறண்ட மற்றும் மிதமான வானிலை நிலவும்"
  }. அதிகபட்ச வெப்பநிலை ${hottestDay?.tempMax?.toFixed(1) ?? "—"}°C வரை செல்லலாம்; அதிக மழை வாய்ப்பு ${
    wettestDay?.date ?? ""
  } அன்று (${(wettestDay?.precipitationSum ?? 0).toFixed(1)} மி.மீ) காணப்படுகிறது.`;
  const ta30Day = `16 முதல் 30-ஆம் நாள் வரையிலான நீண்டகால கணிப்பில் (ECMWF SEAS5), ${location.name} பகுதியில் வெப்பநிலை ${
    extWarmDays > extCoolDays + 3 ? "சராசரியை விட சற்று அதிகமாக" : "சராசரி அளவில்"
  } இருக்க வாய்ப்புள்ளது. இது நீண்டகால போக்கு கணிப்பு என்பதால் நிச்சயத்தன்மை குறைவாக இருக்கும்.`;

  const headline =
    (tomorrow?.rainProbability ?? 0) >= 55
      ? `${location.name}: Rain Likely (${tomorrow?.rainProbability}% Chance) • ${curTemp}`
      : (hottestDay?.tempMax ?? 0) >= 36
      ? `${location.name}: Warm Conditions Ahead • Highs near ${hottestDay?.tempMax?.toFixed(0)}°C`
      : `${location.name}: ${curInfo.label} • ${curTemp} Now`;

  const keyTakeaways = [
    `Current: ${curInfo.label} at ${curTemp} (${curHum} RH, wind ${curWind}).`,
    `Tomorrow: ${tomorrow?.tempMin?.toFixed(0) ?? "—"}°C–${tomorrow?.tempMax?.toFixed(0) ?? "—"}°C, ${
      tomorrow?.rainProbability ?? 0
    }% rain probability.`,
    `7-Day Peak Rain: ${(wettestDay?.precipitationSum ?? 0).toFixed(1)} mm on ${wettestDay?.date ?? "—"}.`,
    alerts.length > 0
      ? `Active Signals: ${alerts.length} alert(s)/indicator(s) — check Official vs AI Risk tags.`
      : "No severe weather thresholds triggered in current ECMWF runs.",
  ];

  const joinBilingual = (en: string, ta: string) => `${en}\n\n[தமிழ்]\n${ta}`;

  return {
    generatedBy: "DETERMINISTIC_DATA_ENGINE",
    modelUsed: "VAANAM AI Deterministic Meteorological Synthesizer (grounded in ECMWF IFS/ENS & SEAS5)",
    language,
    generatedAt: new Date().toISOString(),
    headline,
    currentExplanation:
      language === "ta" ? taCurrent : language === "bilingual" ? joinBilingual(enCurrent, taCurrent) : enCurrent,
    dailyBriefing:
      language === "ta" ? taDaily : language === "bilingual" ? joinBilingual(enDaily, taDaily) : enDaily,
    weeklyBriefing:
      language === "ta" ? taWeekly : language === "bilingual" ? joinBilingual(enWeekly, taWeekly) : enWeekly,
    outlook30Day:
      language === "ta" ? ta30Day : language === "bilingual" ? joinBilingual(en30Day, ta30Day) : en30Day,
    keyTakeaways,
    disclaimer: DISCLAIMER,
  };
}

export async function generateAiWeatherReport(
  payload: WeatherIntelligencePayload,
  language: ContentLanguage
): Promise<AiAnalystReport> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return buildDeterministicReport(payload, language);
  }

  try {
    const modelName = process.env.GEMINI_MODEL || "gemini-2.0-flash";
    const compactData = {
      location: {
        name: payload.location.name,
        state: payload.location.state,
        country: payload.location.country,
        timezone: payload.location.timezone,
      },
      current: payload.current,
      next7Days: payload.daily30.slice(0, 7).map((d) => ({
        date: d.date,
        minC: d.tempMin,
        maxC: d.tempMax,
        rainProbPct: d.rainProbability,
        precipMm: d.precipitationSum,
        windKmh: d.windSpeedMax,
        confidence: d.confidence,
      })),
      extendedDays16To30: payload.daily30.slice(15, 30).map((d) => ({
        date: d.date,
        tempTendency: d.tempTendency,
        rainTendency: d.rainTendency,
        rainProbPct: d.rainProbability,
        outlook: d.outlookSummary,
      })),
      agreement: payload.comparison.agreementLevel,
      alerts: payload.alerts.map((a) => ({ origin: a.origin, severity: a.severity, title: a.title })),
    };

    const langInstruction =
      language === "ta"
        ? "Write all narrative fields in clear, natural Tamil (தமிழ்) suitable for everyday citizens."
        : language === "bilingual"
        ? "Write every narrative field in English first, followed by a blank line and a natural Tamil (தமிழ்) translation."
        : "Write all narrative fields in clear, conversational, layman-friendly English.";

    const prompt = `You are VAANAM AI, a senior meteorological communicator.
Translate ONLY the real weather model data below into clear, non-technical, conversational briefings.
STRICT RULES:
- Never invent any temperature, rainfall amount, probability, or storm not present in the JSON.
- Avoid jargon unless briefly explained.
- Clearly acknowledge lower certainty for Days 16–30 extended-range outlooks.
- ${langInstruction}

Return ONLY valid JSON with exact keys:
{
  "headline": string,
  "currentExplanation": string,
  "dailyBriefing": string,
  "weeklyBriefing": string,
  "outlook30Day": string,
  "keyTakeaways": string[] (4 short bullet strings)
}

REAL MODEL DATA:
${JSON.stringify(compactData)}`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        modelName
      )}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            responseMimeType: "application/json",
          },
        }),
        signal: AbortSignal.timeout(15000),
      }
    );

    if (!res.ok) {
      throw new Error(`Gemini API HTTP ${res.status}`);
    }
    const json = await res.json();
    const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) throw new Error("Empty Gemini response");

    const parsed = JSON.parse(rawText);
    return {
      generatedBy: "GEMINI_AI",
      modelUsed: modelName,
      language,
      generatedAt: new Date().toISOString(),
      headline: parsed.headline || `${payload.location.name} Weather Intelligence`,
      currentExplanation: parsed.currentExplanation || "",
      dailyBriefing: parsed.dailyBriefing || "",
      weeklyBriefing: parsed.weeklyBriefing || "",
      outlook30Day: parsed.outlook30Day || "",
      keyTakeaways: Array.isArray(parsed.keyTakeaways) ? parsed.keyTakeaways.slice(0, 5) : [],
      disclaimer: DISCLAIMER,
    };
  } catch {
    return buildDeterministicReport(payload, language);
  }
}
