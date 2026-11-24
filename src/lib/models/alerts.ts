import { isInsideIndia, isInsideUsHrefCoverage } from "@/lib/location";
import { DailyForecastPoint, GeoLocation, HourlyPoint, WeatherAlert } from "@/types/weather";

/**
 * Fetches official government alerts where publicly available (NWS for US, IMD CAP feed for India)
 * and synthesises AI-generated risk indicators strictly from real numerical weather model outputs.
 * Official warnings and AI risk indicators are strictly separated by `origin`.
 */
export async function gatherWeatherAlerts(
  location: GeoLocation,
  hourly: HourlyPoint[],
  daily: DailyForecastPoint[]
): Promise<WeatherAlert[]> {
  const alerts: WeatherAlert[] = [];

  // 1. Official US NWS Active Alerts (when inside US coverage)
  if (isInsideUsHrefCoverage(location.latitude, location.longitude)) {
    try {
      const res = await fetch(
        `https://api.weather.gov/alerts/active?point=${location.latitude.toFixed(4)},${location.longitude.toFixed(4)}`,
        {
          headers: { "User-Agent": "VAANAM-AI-WeatherPortal/1.0" },
          signal: AbortSignal.timeout(7000),
        }
      );
      if (res.ok) {
        const json = await res.json();
        const features = Array.isArray(json.features) ? json.features : [];
        for (const f of features.slice(0, 5)) {
          const p = f.properties || {};
          alerts.push({
            id: `nws-${f.id || Math.random()}`,
            origin: "OFFICIAL_NWS",
            severity:
              p.severity === "Extreme"
                ? "EXTREME"
                : p.severity === "Severe"
                ? "SEVERE"
                : "MODERATE",
            category: "OFFICIAL_WARNING",
            title: p.event || "Official NWS Weather Alert",
            description: p.headline || p.description?.slice(0, 280) || "Official weather advisory issued by NOAA/NWS.",
            validFrom: p.effective,
            validTo: p.expires,
            source: "NOAA / National Weather Service (Official)",
            url: "https://www.weather.gov",
          });
        }
      }
    } catch {
      // Non-blocking: official feed timeout does not break portal
    }
  }

  // 2. Official India IMD Sachet / CAP RSS check (when inside India)
  if (isInsideIndia(location.latitude, location.longitude, location.countryCode)) {
    try {
      const imdRes = await fetch("https://sachet.ndma.gov.in/cap_public_website/rss/rss_india.xml", {
        signal: AbortSignal.timeout(5000),
      });
      if (imdRes.ok) {
        const xml = await imdRes.text();
        const stateName = (location.state || location.name || "").toLowerCase();
        const itemMatches = xml.match(/<item>[\s\S]*?<\/item>/gi) || [];
        for (const item of itemMatches.slice(0, 20)) {
          const titleMatch = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/i);
          const descMatch = item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>|<description>(.*?)<\/description>/i);
          const title = (titleMatch?.[1] || titleMatch?.[2] || "").trim();
          const desc = (descMatch?.[1] || descMatch?.[2] || "").replace(/<[^>]+>/g, "").trim();
          const combined = `${title} ${desc}`.toLowerCase();
          if (
            stateName &&
            (combined.includes(stateName) ||
              combined.includes(location.name.toLowerCase()) ||
              (stateName.includes("tamil") && combined.includes("tamil")))
          ) {
            alerts.push({
              id: `imd-${alerts.length}-${Date.now()}`,
              origin: "OFFICIAL_IMD",
              severity: combined.includes("red") || combined.includes("cyclone") ? "EXTREME" : combined.includes("orange") || combined.includes("heavy") ? "SEVERE" : "MODERATE",
              category: "OFFICIAL_WARNING",
              title: title || "Official IMD / NDMA Weather Advisory",
              description: desc.slice(0, 320) || "Active alert from India Meteorological Department / NDMA CAP feed.",
              source: "IMD / NDMA Sachet CAP (Official Government Feed)",
              url: "https://mausam.imd.gov.in/",
            });
          }
        }
      }
    } catch {
      // Non-blocking if IMD CAP RSS is unreachable
    }
  }

  // 3. AI / Model-Derived Risk Indicators (strictly from real ECMWF numerical outputs)
  const next72h = hourly.slice(0, 72);
  const next7Days = daily.slice(0, 7);

  // Heavy rainfall check
  const maxDayPrecip = Math.max(...next7Days.map((d) => d.precipitationSum ?? 0), 0);
  const maxHeavyRainProb = Math.max(...next7Days.map((d) => d.heavyRainProbability ?? 0), 0);
  if (maxDayPrecip >= 25 || maxHeavyRainProb >= 35) {
    const wetDay = next7Days.find((d) => (d.precipitationSum ?? 0) === maxDayPrecip) || next7Days[0];
    alerts.push({
      id: "ai-heavy-rain",
      origin: "AI_RISK_INDICATOR",
      severity: maxDayPrecip >= 65 ? "SEVERE" : "MODERATE",
      category: "HEAVY_RAIN",
      title: `Heavy Rainfall Potential (${maxDayPrecip.toFixed(1)} mm)`,
      description: `ECMWF IFS & ENS indicate up to ${maxDayPrecip.toFixed(1)} mm rainfall around ${wetDay?.date ?? "the coming days"} with ${maxHeavyRainProb}% ensemble heavy-rain probability. Plan travel carefully and monitor official IMD/local advisories.`,
      validFrom: wetDay?.date,
      source: "VAANAM AI Risk Engine (derived from ECMWF ENS)",
    });
  }

  // Thunderstorm check
  const stormHours = next72h.filter((h) => h.weatherCode >= 95);
  if (stormHours.length > 0) {
    alerts.push({
      id: "ai-thunderstorm",
      origin: "AI_RISK_INDICATOR",
      severity: "SEVERE",
      category: "THUNDERSTORM",
      title: "Convective Thunderstorm Signal",
      description: `Model guidance shows thunderstorm activity across ${stormHours.length} forecast hour(s) within the next 72 hours (starting near ${stormHours[0].time}). Lightning and gusty winds are possible.`,
      validFrom: stormHours[0].time,
      source: "VAANAM AI Risk Engine (derived from ECMWF IFS)",
    });
  }

  // Strong wind & low pressure / possible tropical disturbance check
  const maxWind = Math.max(...next72h.map((h) => h.windSpeed ?? 0), 0);
  const minPressure = Math.min(...next72h.map((h) => h.pressure ?? 1013), 1013);
  if (maxWind >= 40) {
    alerts.push({
      id: "ai-strong-wind",
      origin: "AI_RISK_INDICATOR",
      severity: maxWind >= 60 ? "SEVERE" : "MODERATE",
      category: "STRONG_WIND",
      title: `Strong Wind Advisory (${Math.round(maxWind)} km/h)`,
      description: `Sustained winds up to ${Math.round(maxWind)} km/h are projected in the next 72 hours. Coastal and exposed areas may experience rough conditions.`,
      source: "VAANAM AI Risk Engine (derived from ECMWF IFS)",
    });
  }

  if (minPressure <= 998 && maxWind >= 45) {
    alerts.push({
      id: "ai-cyclone-watch",
      origin: "AI_RISK_INDICATOR",
      severity: "EXTREME",
      category: "CYCLONE",
      title: `Deep Low-Pressure / Cyclonic Disturbance Signal (${minPressure.toFixed(0)} hPa)`,
      description: `Mean sea-level pressure is projected to drop to ${minPressure.toFixed(1)} hPa alongside winds near ${Math.round(maxWind)} km/h. This is a model-derived risk indicator — strictly follow official IMD cyclone bulletins.`,
      source: "VAANAM AI Risk Engine (derived from ECMWF IFS)",
    });
  }

  // Heatwave check
  const maxTemp = Math.max(...next7Days.map((d) => d.tempMax ?? -99), -99);
  if (maxTemp >= 38) {
    alerts.push({
      id: "ai-heatwave",
      origin: "AI_RISK_INDICATOR",
      severity: maxTemp >= 42 ? "SEVERE" : "MODERATE",
      category: "HEATWAVE",
      title: `Elevated Heat Stress (${maxTemp.toFixed(1)}°C)`,
      description: `Daytime highs are forecast to reach ${maxTemp.toFixed(1)}°C over the next 7 days. Stay hydrated and limit direct midday sun exposure.`,
      source: "VAANAM AI Risk Engine (derived from ECMWF IFS)",
    });
  }

  // Sudden temperature drop check (>6°C day-to-day drop)
  for (let i = 1; i < next7Days.length; i++) {
    const prev = next7Days[i - 1].tempMax;
    const curr = next7Days[i].tempMax;
    if (prev !== null && curr !== null && prev - curr >= 6.0) {
      alerts.push({
        id: `ai-temp-drop-${i}`,
        origin: "AI_RISK_INDICATOR",
        severity: "INFO",
        category: "TEMP_DROP",
        title: `Notable Temperature Drop (-${(prev - curr).toFixed(1)}°C)`,
        description: `Daytime maximum temperature is projected to drop from ${prev.toFixed(1)}°C to ${curr.toFixed(1)}°C on ${next7Days[i].date}.`,
        validFrom: next7Days[i].date,
        source: "VAANAM AI Risk Engine (derived from ECMWF IFS)",
      });
      break;
    }
  }

  // High ensemble uncertainty / model divergence indicator
  const highSpreadDays = next7Days.filter((d) => (d.tempSpread ?? 0) >= 2.5);
  if (highSpreadDays.length >= 2) {
    alerts.push({
      id: "ai-model-spread",
      origin: "AI_RISK_INDICATOR",
      severity: "INFO",
      category: "MODEL_SHIFT",
      title: "Elevated Forecast Uncertainty Detected",
      description: `ECMWF ENS 51 members show widened spread across ${highSpreadDays.length} day(s) this week. Expect forecast refinements as newer model runs arrive.`,
      source: "VAANAM AI Risk Engine (derived from ECMWF ENS spread)",
    });
  }

  return alerts;
}
