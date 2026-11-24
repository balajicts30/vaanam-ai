import { StoryThemeId } from "@/types/weather";

export interface StoryTheme {
  id: StoryThemeId;
  name: string;
  tagline: string;
  bgStops: [string, string, string];
  accent: string;
  accentSecondary: string;
  textPrimary: string;
  textSecondary: string;
  cardBg: string;
  cardBorder: string;
  motionStyle: "clouds" | "rain" | "storm" | "radar" | "sunbeams" | "waves" | "minimal";
}

export const STORY_THEMES: StoryTheme[] = [
  {
    id: "cinematic",
    name: "Cinematic Weather",
    tagline: "Deep twilight atmosphere with electric cyan highlights",
    bgStops: ["#040b18", "#0c2240", "#133a63"],
    accent: "#38bdf8",
    accentSecondary: "#818cf8",
    textPrimary: "#f8fafc",
    textSecondary: "#cbd5e1",
    cardBg: "rgba(15, 23, 42, 0.58)",
    cardBorder: "rgba(56, 189, 248, 0.35)",
    motionStyle: "clouds",
  },
  {
    id: "minimal-news",
    name: "Minimal Weather News",
    tagline: "Crisp broadcast newsroom typography & high contrast",
    bgStops: ["#0b1120", "#172554", "#0f172a"],
    accent: "#22d3ee",
    accentSecondary: "#facc15",
    textPrimary: "#ffffff",
    textSecondary: "#94a3b8",
    cardBg: "rgba(30, 41, 59, 0.72)",
    cardBorder: "rgba(255, 255, 255, 0.22)",
    motionStyle: "minimal",
  },
  {
    id: "tropical-monsoon",
    name: "Tropical Monsoon",
    tagline: "Lush emerald & deep monsoon rain-cloud palette",
    bgStops: ["#022c22", "#064e3b", "#0f172a"],
    accent: "#34d399",
    accentSecondary: "#38bdf8",
    textPrimary: "#ecfdf5",
    textSecondary: "#a7f3d0",
    cardBg: "rgba(6, 78, 59, 0.55)",
    cardBorder: "rgba(52, 211, 153, 0.4)",
    motionStyle: "rain",
  },
  {
    id: "storm-tracker",
    name: "Storm Tracker",
    tagline: "High-alert violet & crimson severe-weather aesthetic",
    bgStops: ["#0f0720", "#2e1065", "#1e1b4b"],
    accent: "#f43f5e",
    accentSecondary: "#a855f7",
    textPrimary: "#ffffff",
    textSecondary: "#ddd6fe",
    cardBg: "rgba(46, 16, 101, 0.6)",
    cardBorder: "rgba(244, 63, 94, 0.45)",
    motionStyle: "storm",
  },
  {
    id: "sunrise-sunset",
    name: "Sunrise and Sunset",
    tagline: "Warm golden-hour amber, coral & twilight indigo",
    bgStops: ["#1e1b4b", "#9a3412", "#d97706"],
    accent: "#fde047",
    accentSecondary: "#fb923c",
    textPrimary: "#fffbeb",
    textSecondary: "#fed7aa",
    cardBg: "rgba(30, 27, 75, 0.52)",
    cardBorder: "rgba(253, 224, 71, 0.4)",
    motionStyle: "sunbeams",
  },
  {
    id: "futuristic-radar",
    name: "Futuristic Weather Radar",
    tagline: "Neon telemetry grid & Doppler sweep visuals",
    bgStops: ["#020617", "#082f49", "#042f2e"],
    accent: "#06b6d4",
    accentSecondary: "#10b981",
    textPrimary: "#ecfeff",
    textSecondary: "#67e8f9",
    cardBg: "rgba(2, 6, 23, 0.72)",
    cardBorder: "rgba(6, 182, 212, 0.5)",
    motionStyle: "radar",
  },
  {
    id: "premium-editorial",
    name: "Premium Editorial",
    tagline: "Refined magazine layout with champagne gold accents",
    bgStops: ["#111827", "#1f2937", "#030712"],
    accent: "#f59e0b",
    accentSecondary: "#e5e7eb",
    textPrimary: "#f9fafb",
    textSecondary: "#d1d5db",
    cardBg: "rgba(17, 24, 39, 0.7)",
    cardBorder: "rgba(245, 158, 11, 0.38)",
    motionStyle: "minimal",
  },
  {
    id: "dark-atmospheric",
    name: "Dark Atmospheric",
    tagline: "Moody obsidian slate with subtle storm-blue glow",
    bgStops: ["#020617", "#0f172a", "#1e293b"],
    accent: "#60a5fa",
    accentSecondary: "#38bdf8",
    textPrimary: "#f1f5f9",
    textSecondary: "#94a3b8",
    cardBg: "rgba(15, 23, 42, 0.68)",
    cardBorder: "rgba(96, 165, 250, 0.3)",
    motionStyle: "clouds",
  },
  {
    id: "bright-summer",
    name: "Bright Summer",
    tagline: "Vibrant azure sky & sunlit coastal warmth",
    bgStops: ["#0369a1", "#0284c7", "#38bdf8"],
    accent: "#fef08a",
    accentSecondary: "#ffffff",
    textPrimary: "#ffffff",
    textSecondary: "#e0f2fe",
    cardBg: "rgba(3, 105, 161, 0.48)",
    cardBorder: "rgba(255, 255, 255, 0.38)",
    motionStyle: "sunbeams",
  },
  {
    id: "coastal-weather",
    name: "Coastal Weather",
    tagline: "Bay of Bengal teal, ocean spray & maritime breeze",
    bgStops: ["#042f2e", "#0e7490", "#164e63"],
    accent: "#2dd4bf",
    accentSecondary: "#7dd3fc",
    textPrimary: "#f0fdfa",
    textSecondary: "#99f6e4",
    cardBg: "rgba(14, 116, 144, 0.45)",
    cardBorder: "rgba(45, 212, 191, 0.42)",
    motionStyle: "waves",
  },
];

export function getStoryTheme(id: StoryThemeId): StoryTheme {
  return STORY_THEMES.find((t) => t.id === id) || STORY_THEMES[0];
}
