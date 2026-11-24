export type WeatherCategory =
  | "clear"
  | "partly_cloudy"
  | "cloudy"
  | "fog"
  | "drizzle"
  | "rain"
  | "heavy_rain"
  | "thunderstorm"
  | "snow";

export interface WeatherCodeInfo {
  code: number;
  label: string;
  labelTa: string;
  shortLabel: string;
  category: WeatherCategory;
  emoji: string;
  accentGradient: string;
}

const WMO_MAP: Record<number, Omit<WeatherCodeInfo, "code">> = {
  0: {
    label: "Clear Sky",
    labelTa: "தெளிவான வானம்",
    shortLabel: "Clear",
    category: "clear",
    emoji: "☀️",
    accentGradient: "from-sky-500/20 via-blue-600/15 to-amber-500/15",
  },
  1: {
    label: "Mainly Clear",
    labelTa: "பெரும்பாலும் தெளிவு",
    shortLabel: "Mainly Clear",
    category: "clear",
    emoji: "🌤️",
    accentGradient: "from-sky-500/20 via-cyan-500/15 to-blue-600/15",
  },
  2: {
    label: "Partly Cloudy",
    labelTa: "பகுதி மேகமூட்டம்",
    shortLabel: "Partly Cloudy",
    category: "partly_cloudy",
    emoji: "⛅",
    accentGradient: "from-slate-500/20 via-sky-600/15 to-indigo-700/15",
  },
  3: {
    label: "Overcast",
    labelTa: "முழு மேகமூட்டம்",
    shortLabel: "Overcast",
    category: "cloudy",
    emoji: "☁️",
    accentGradient: "from-slate-600/25 via-slate-700/20 to-blue-900/20",
  },
  45: {
    label: "Fog & Mist",
    labelTa: "பனிமூட்டம்",
    shortLabel: "Fog",
    category: "fog",
    emoji: "🌫️",
    accentGradient: "from-slate-500/25 via-zinc-600/20 to-slate-800/25",
  },
  48: {
    label: "Depositing Rime Fog",
    labelTa: "அடர்ந்த பனிமூட்டம்",
    shortLabel: "Dense Fog",
    category: "fog",
    emoji: "🌫️",
    accentGradient: "from-slate-500/25 via-zinc-600/20 to-slate-800/25",
  },
  51: {
    label: "Light Drizzle",
    labelTa: "லேசான தூறல்",
    shortLabel: "Light Drizzle",
    category: "drizzle",
    emoji: "🌦️",
    accentGradient: "from-cyan-700/20 via-blue-800/20 to-slate-900/25",
  },
  53: {
    label: "Moderate Drizzle",
    labelTa: "மிதமான தூறல்",
    shortLabel: "Drizzle",
    category: "drizzle",
    emoji: "🌦️",
    accentGradient: "from-cyan-700/25 via-blue-800/25 to-slate-900/25",
  },
  55: {
    label: "Dense Drizzle",
    labelTa: "அடர்ந்த தூறல்",
    shortLabel: "Dense Drizzle",
    category: "drizzle",
    emoji: "🌧️",
    accentGradient: "from-blue-700/25 via-indigo-800/25 to-slate-900/25",
  },
  61: {
    label: "Slight Rain",
    labelTa: "லேசான மழை",
    shortLabel: "Light Rain",
    category: "rain",
    emoji: "🌧️",
    accentGradient: "from-blue-600/25 via-cyan-800/25 to-slate-900/30",
  },
  63: {
    label: "Moderate Rain",
    labelTa: "மிதமான மழை",
    shortLabel: "Moderate Rain",
    category: "rain",
    emoji: "🌧️",
    accentGradient: "from-blue-700/30 via-indigo-800/25 to-slate-900/30",
  },
  65: {
    label: "Heavy Rain",
    labelTa: "கனமழை",
    shortLabel: "Heavy Rain",
    category: "heavy_rain",
    emoji: "⛈️",
    accentGradient: "from-indigo-700/35 via-blue-900/30 to-slate-950/35",
  },
  71: {
    label: "Light Snow",
    labelTa: "லேசான பனிப்பொழிவு",
    shortLabel: "Light Snow",
    category: "snow",
    emoji: "🌨️",
    accentGradient: "from-sky-300/20 via-blue-400/15 to-slate-700/20",
  },
  73: {
    label: "Moderate Snow",
    labelTa: "மிதமான பனிப்பொழிவு",
    shortLabel: "Snow",
    category: "snow",
    emoji: "❄️",
    accentGradient: "from-sky-300/25 via-blue-500/20 to-slate-800/25",
  },
  75: {
    label: "Heavy Snow",
    labelTa: "கனம பனிப்பொழிவு",
    shortLabel: "Heavy Snow",
    category: "snow",
    emoji: "❄️",
    accentGradient: "from-sky-200/25 via-indigo-500/20 to-slate-800/25",
  },
  80: {
    label: "Slight Rain Showers",
    labelTa: "லேசான மழைத் தூறல்",
    shortLabel: "Light Showers",
    category: "rain",
    emoji: "🌦️",
    accentGradient: "from-cyan-600/25 via-blue-800/25 to-slate-900/30",
  },
  81: {
    label: "Moderate Rain Showers",
    labelTa: "மிதமான மழை",
    shortLabel: "Showers",
    category: "rain",
    emoji: "🌧️",
    accentGradient: "from-blue-700/30 via-cyan-900/25 to-slate-900/30",
  },
  82: {
    label: "Violent Rain Showers",
    labelTa: "கனமழைப் பொழிவு",
    shortLabel: "Heavy Showers",
    category: "heavy_rain",
    emoji: "⛈️",
    accentGradient: "from-indigo-800/35 via-blue-900/30 to-slate-950/40",
  },
  95: {
    label: "Thunderstorm",
    labelTa: "இடியுடன் கூடிய மழை",
    shortLabel: "Thunderstorm",
    category: "thunderstorm",
    emoji: "⛈️",
    accentGradient: "from-violet-700/35 via-indigo-900/30 to-slate-950/40",
  },
  96: {
    label: "Thunderstorm with Hail",
    labelTa: "ஆலங்கட்டி இடியுடன் மழை",
    shortLabel: "T-Storm & Hail",
    category: "thunderstorm",
    emoji: "🌩️",
    accentGradient: "from-purple-800/35 via-indigo-950/35 to-slate-950/40",
  },
  99: {
    label: "Severe Thunderstorm",
    labelTa: "கடும் இடியுடன் மழை",
    shortLabel: "Severe T-Storm",
    category: "thunderstorm",
    emoji: "🌩️",
    accentGradient: "from-rose-800/35 via-purple-950/35 to-slate-950/40",
  },
};

export function getWeatherCodeInfo(code: number | null | undefined): WeatherCodeInfo {
  const c = typeof code === "number" && !Number.isNaN(code) ? code : 2;
  const matched = WMO_MAP[c];
  if (matched) return { code: c, ...matched };
  if (c >= 95) return { code: c, ...WMO_MAP[95] };
  if (c >= 80) return { code: c, ...WMO_MAP[81] };
  if (c >= 61) return { code: c, ...WMO_MAP[63] };
  if (c >= 51) return { code: c, ...WMO_MAP[53] };
  if (c >= 45) return { code: c, ...WMO_MAP[45] };
  return { code: c, ...WMO_MAP[2] };
}
