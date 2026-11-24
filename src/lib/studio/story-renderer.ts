import { getStoryTheme } from "./themes";
import { StoryThemeId } from "@/types/weather";

export const STORY_DURATION_SEC = 6;

export interface StoryRenderPayload {
  city: string;
  region: string;
  dateLabel: string;
  conditionLabel: string;
  conditionEmoji: string;
  weatherCategory: string;
  headline: string;
  shortSummary: string;
  tempMinC: number | null;
  tempMaxC: number | null;
  currentTempC: number | null;
  rainProbability: number | null;
  heavyRainProbability?: number | null;
  precipitationMm: number | null;
  windKmh: number | null;
  humidityPct: number | null;
  confidence: "HIGH" | "MODERATE" | "LOW";
  tempUnit: "C" | "F";
  rainUnit?: "mm" | "in";
  windUnit?: "kmh" | "ms";
  themeId: StoryThemeId;
  designVariant: number; // 0, 1, 2
  timelinePreview: Array<{ label: string; temp: string; rainPct: number; precipMm?: number }>;
}

// Generic 2D canvas context interface compatible with both browser HTMLCanvasElement and @napi-rs/canvas
export interface Canvas2DLike {
  fillStyle: string | CanvasGradient | CanvasPattern;
  strokeStyle: string | CanvasGradient | CanvasPattern;
  lineWidth: number;
  globalAlpha: number;
  font: string;
  textAlign: "left" | "right" | "center" | "start" | "end";
  textBaseline: "top" | "hanging" | "middle" | "alphabetic" | "ideographic" | "bottom";
  createLinearGradient(x0: number, y0: number, x1: number, y1: number): CanvasGradient;
  createRadialGradient(x0: number, y0: number, r0: number, x1: number, y1: number, r1: number): CanvasGradient;
  fillRect(x: number, y: number, w: number, h: number): void;
  strokeRect(x: number, y: number, w: number, h: number): void;
  beginPath(): void;
  closePath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  arc(x: number, y: number, r: number, startAngle: number, endAngle: number): void;
  ellipse(x: number, y: number, rx: number, ry: number, rot: number, start: number, end: number): void;
  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void;
  fill(): void;
  stroke(): void;
  fillText(text: string, x: number, y: number, maxWidth?: number): void;
  measureText(text: string): { width: number };
  save(): void;
  restore(): void;
  translate(x: number, y: number): void;
}

function fmtTemp(c: number | null, unit: "C" | "F"): string {
  if (c === null || Number.isNaN(c)) return "—";
  const val = unit === "F" ? (c * 9) / 5 + 32 : c;
  return `${Math.round(val)}°${unit}`;
}

function drawRoundedRect(
  ctx: Canvas2DLike,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function wrapText(
  ctx: Canvas2DLike,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines = 4
): number {
  const words = text.split(/\s+/);
  let line = "";
  let lineCount = 0;
  let curY = y;

  for (let i = 0; i < words.length; i++) {
    const testLine = line ? `${line} ${words[i]}` : words[i];
    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line, x, curY);
      line = words[i];
      curY += lineHeight;
      lineCount++;
      if (lineCount >= maxLines - 1) break;
    } else {
      line = testLine;
    }
  }
  if (line && lineCount < maxLines) {
    ctx.fillText(line, x, curY);
    curY += lineHeight;
  }
  return curY;
}

function drawWeatherEffects(
  ctx: Canvas2DLike,
  w: number,
  h: number,
  tSec: number,
  category: string,
  theme: ReturnType<typeof getStoryTheme>
) {
  // 1. Subtle animated atmospheric glow orb
  const orbX = w * (0.5 + 0.16 * Math.sin(tSec * 0.6));
  const orbY = h * (0.28 + 0.05 * Math.cos(tSec * 0.5));
  const rad = ctx.createRadialGradient(orbX, orbY, 20, orbX, orbY, w * 0.65);
  rad.addColorStop(0, `${theme.accent}44`);
  rad.addColorStop(0.55, `${theme.accentSecondary}18`);
  rad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = rad;
  ctx.fillRect(0, 0, w, h);

  // 2. Radar rings for futuristic-radar theme
  if (theme.motionStyle === "radar") {
    ctx.save();
    ctx.strokeStyle = `${theme.accent}33`;
    ctx.lineWidth = 2;
    const cx = w * 0.5;
    const cy = h * 0.48;
    for (let r = 120; r <= w * 0.7; r += 130) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    // Sweep line
    const angle = (tSec * 1.1) % (Math.PI * 2);
    ctx.strokeStyle = `${theme.accent}99`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(angle) * w * 0.65, cy + Math.sin(angle) * w * 0.65);
    ctx.stroke();
    ctx.restore();
  }

  // 3. Animated drifting cloud silhouettes
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.065)";
  for (let i = 0; i < 6; i++) {
    const speed = 28 + i * 11;
    const cx = ((i * 290 + tSec * speed) % (w + 480)) - 240;
    const cy = 170 + i * (h * 0.11);
    const rx = 180 + (i % 3) * 70;
    const ry = 55 + (i % 2) * 25;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // 4. Moving rain streaks when rainy / thunderstorm / monsoon theme
  const isRainy =
    category === "rain" ||
    category === "heavy_rain" ||
    category === "drizzle" ||
    category === "thunderstorm" ||
    theme.motionStyle === "rain" ||
    theme.motionStyle === "storm";

  if (isRainy) {
    ctx.save();
    ctx.strokeStyle = "rgba(186, 230, 253, 0.32)";
    ctx.lineWidth = 2.5;
    const drops = category === "heavy_rain" || category === "thunderstorm" ? 75 : 42;
    for (let i = 0; i < drops; i++) {
      const seed = (i * 197.3) % 1;
      const x = ((i * 97 + tSec * 140) % (w + 100)) - 50;
      const y = ((seed * h + tSec * (520 + (i % 5) * 90)) % (h + 120)) - 60;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 10, y + 36);
      ctx.stroke();
    }
    ctx.restore();
  }

  // 5. Subtle lightning flash for thunderstorms
  if (category === "thunderstorm" || theme.motionStyle === "storm") {
    const flashWindow = Math.sin(tSec * 4.7) * Math.sin(tSec * 11.3);
    if (flashWindow > 0.88) {
      ctx.save();
      ctx.fillStyle = "rgba(224, 242, 254, 0.16)";
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(w * 0.68, 0);
      ctx.lineTo(w * 0.61, h * 0.14);
      ctx.lineTo(w * 0.66, h * 0.16);
      ctx.lineTo(w * 0.56, h * 0.33);
      ctx.stroke();
      ctx.restore();
    }
  }

  // 6. Moving wind particles
  ctx.save();
  ctx.strokeStyle = `${theme.accent}45`;
  ctx.lineWidth = 2;
  for (let i = 0; i < 14; i++) {
    const wx = ((i * 180 + tSec * (160 + (i % 4) * 45)) % (w + 260)) - 130;
    const wy = 140 + ((i * 137) % (h - 260));
    ctx.beginPath();
    ctx.moveTo(wx, wy);
    ctx.lineTo(wx + 65 + (i % 3) * 25, wy + Math.sin(tSec * 2 + i) * 6);
    ctx.stroke();
  }
  ctx.restore();
}

function drawWeatherIcon(
  ctx: Canvas2DLike,
  cx: number,
  cy: number,
  size: number,
  category: string,
  accent: string,
  tSec: number
) {
  ctx.save();
  const bob = Math.sin(tSec * 2.5) * 8;
  const y = cy + bob;

  if (category === "clear") {
    // Sun core + rays
    ctx.fillStyle = "#fbbf24";
    ctx.beginPath();
    ctx.arc(cx, y, size * 0.34, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#fde047";
    ctx.lineWidth = 6;
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4 + tSec * 0.35;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * size * 0.44, y + Math.sin(a) * size * 0.44);
      ctx.lineTo(cx + Math.cos(a) * size * 0.58, y + Math.sin(a) * size * 0.58);
      ctx.stroke();
    }
  } else {
    // Cloud shape
    ctx.fillStyle = "#e2e8f0";
    ctx.beginPath();
    ctx.arc(cx - size * 0.22, y + size * 0.05, size * 0.24, 0, Math.PI * 2);
    ctx.arc(cx + size * 0.04, y - size * 0.1, size * 0.3, 0, Math.PI * 2);
    ctx.arc(cx + size * 0.28, y + size * 0.06, size * 0.22, 0, Math.PI * 2);
    ctx.fillRect(cx - size * 0.26, y + size * 0.05, size * 0.56, size * 0.24);
    ctx.fill();

    if (category === "rain" || category === "heavy_rain" || category === "drizzle") {
      ctx.strokeStyle = accent;
      ctx.lineWidth = 6;
      for (let i = -1; i <= 1; i++) {
        const dropOffset = ((tSec * 60 + i * 18) % 28);
        ctx.beginPath();
        ctx.moveTo(cx + i * size * 0.2, y + size * 0.34 + dropOffset * 0.4);
        ctx.lineTo(cx + i * size * 0.2 - 7, y + size * 0.52 + dropOffset * 0.4);
        ctx.stroke();
      }
    } else if (category === "thunderstorm") {
      ctx.fillStyle = "#facc15";
      ctx.beginPath();
      ctx.moveTo(cx + 6, y + size * 0.28);
      ctx.lineTo(cx - 14, y + size * 0.52);
      ctx.lineTo(cx + 2, y + size * 0.52);
      ctx.lineTo(cx - 8, y + size * 0.72);
      ctx.lineTo(cx + 22, y + size * 0.44);
      ctx.lineTo(cx + 4, y + size * 0.44);
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.restore();
}

/**
 * Renders a 1080×1080 (1:1) Facebook Weather Post on a 2D Canvas.
 */
export function renderFacebookPost(
  ctx: Canvas2DLike,
  w: number,
  h: number,
  data: StoryRenderPayload
) {
  const theme = getStoryTheme(data.themeId);

  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, theme.bgStops[0]);
  grad.addColorStop(0.5, theme.bgStops[1]);
  grad.addColorStop(1, theme.bgStops[2]);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Atmospheric effects
  drawWeatherEffects(ctx, w, h, 1.8 + data.designVariant * 1.4, data.weatherCategory, theme);

  // Top Header Bar
  ctx.fillStyle = theme.cardBg;
  ctx.strokeStyle = theme.cardBorder;
  ctx.lineWidth = 2;
  drawRoundedRect(ctx, 56, 52, w - 112, 84, 24);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = theme.accent;
  ctx.font = "bold 26px sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("VAANAM AI • WEATHER INTELLIGENCE", 90, 94);

  ctx.fillStyle = theme.textSecondary;
  ctx.font = "600 24px sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(data.dateLabel.toUpperCase(), w - 90, 94);

  // City & Headline
  ctx.textAlign = "left";
  ctx.fillStyle = theme.textPrimary;
  ctx.font = "900 78px sans-serif";
  ctx.fillText(data.city.toUpperCase(), 62, 224, w - 320);

  ctx.fillStyle = theme.accent;
  ctx.font = "600 30px sans-serif";
  ctx.fillText(data.region, 64, 286, w - 320);

  // Weather icon top-right
  drawWeatherIcon(ctx, w - 160, 235, 130, data.weatherCategory, theme.accent, 1.2);

  // Headline banner
  ctx.fillStyle = theme.textPrimary;
  ctx.font = "700 38px sans-serif";
  wrapText(ctx, data.headline.replace(/[^\x00-\x7F]/g, "").trim() || data.conditionLabel, 64, 360, w - 128, 48, 2);

  // Main Metrics Grid (3 glass cards)
  const cardY = 472;
  const cardH = 210;
  const gap = 24;
  const cardW = (w - 112 - gap * 2) / 3;

  const metrics = [
    {
      label: "TEMPERATURE",
      value: `${fmtTemp(data.tempMinC, data.tempUnit)} – ${fmtTemp(data.tempMaxC, data.tempUnit)}`,
      sub: data.conditionLabel,
    },
    {
      label: "RAIN CHANCE",
      value: data.rainProbability !== null ? `${data.rainProbability}%` : "—",
      sub: data.precipitationMm !== null ? `${data.precipitationMm.toFixed(1)} mm expected` : "Model data",
    },
    {
      label: "WIND & HUMIDITY",
      value: data.windKmh !== null ? `${Math.round(data.windKmh)} km/h` : "—",
      sub: data.humidityPct !== null ? `Humidity ${data.humidityPct}%` : `Confidence: ${data.confidence}`,
    },
  ];

  metrics.forEach((m, idx) => {
    const cx = 56 + idx * (cardW + gap);
    ctx.fillStyle = theme.cardBg;
    ctx.strokeStyle = theme.cardBorder;
    ctx.lineWidth = 2;
    drawRoundedRect(ctx, cx, cardY, cardW, cardH, 24);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = theme.textSecondary;
    ctx.font = "700 20px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(m.label, cx + 26, cardY + 46);

    ctx.fillStyle = theme.textPrimary;
    ctx.font = "800 44px sans-serif";
    ctx.fillText(m.value, cx + 26, cardY + 112, cardW - 44);

    ctx.fillStyle = theme.accent;
    ctx.font = "600 22px sans-serif";
    ctx.fillText(m.sub, cx + 26, cardY + 168, cardW - 44);
  });

  // Layman Explanation Card
  ctx.fillStyle = theme.cardBg;
  ctx.strokeStyle = theme.cardBorder;
  drawRoundedRect(ctx, 56, 714, w - 112, 224, 26);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = theme.accent;
  ctx.font = "700 22px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("FORECAST BRIEFING", 88, 760);

  ctx.fillStyle = theme.textPrimary;
  ctx.font = "500 30px sans-serif";
  wrapText(ctx, data.shortSummary, 88, 808, w - 176, 42, 3);

  // Footer Provenance & Branding
  ctx.fillStyle = theme.textSecondary;
  ctx.font = "600 20px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(`Model: ECMWF IFS & ENS (51 members) • Confidence: ${data.confidence}`, 60, h - 54);

  ctx.fillStyle = theme.accent;
  ctx.font = "800 24px sans-serif";
  ctx.textAlign = "right";
  ctx.fillText("VAANAM AI", w - 60, h - 54);
}

function fmtRainAmt(mm: number | null | undefined, unit: "mm" | "in" = "mm"): string {
  if (mm === null || mm === undefined || Number.isNaN(mm)) return "0.0 mm";
  if (unit === "in") return `${(mm / 25.4).toFixed(2)} in`;
  return `${mm.toFixed(1)} mm`;
}

function fmtWindAmt(kmh: number | null | undefined, unit: "kmh" | "ms" = "kmh"): string {
  if (kmh === null || kmh === undefined || Number.isNaN(kmh)) return "—";
  if (unit === "ms") return `${(kmh / 3.6).toFixed(1)} m/s`;
  return `${Math.round(kmh)} km/h`;
}

function getRainRiskBadge(
  rainProb: number | null,
  precipMm: number | null,
  category: string
): { label: string; color: string; bg: string } {
  const prob = rainProb ?? 0;
  const mm = precipMm ?? 0;
  if (category === "thunderstorm") {
    return { label: "THUNDERSTORM RISK", color: "#e9d5ff", bg: "rgba(139, 92, 246, 0.32)" };
  }
  if (mm >= 25 || category === "heavy_rain") {
    return { label: "HEAVY RAIN ALERT", color: "#bfdbfe", bg: "rgba(59, 130, 246, 0.34)" };
  }
  if (prob >= 60 || mm >= 5) {
    return { label: "LIKELY RAINFALL", color: "#a5f3fc", bg: "rgba(6, 182, 212, 0.30)" };
  }
  if (prob >= 30 || mm >= 1) {
    return { label: "SCATTERED SHOWERS", color: "#bae6fd", bg: "rgba(14, 165, 233, 0.26)" };
  }
  return { label: "LOW RAIN CHANCE", color: "#a7f3d0", bg: "rgba(16, 185, 129, 0.24)" };
}

/**
 * Renders one frame at time `tSec` (0.0 to STORY_DURATION_SEC) of a single-page animated
 * 9:16 (1080×1920) Rain Forecast Video.
 *
 * All rain-related information stays visible on one single page with zero scene changes,
 * accompanied by continuous rain/cloud/wind/pulse/gauge animations that loop seamlessly.
 */
export function renderStoryFrame(
  ctx: Canvas2DLike,
  w: number,
  h: number,
  tSec: number,
  data: StoryRenderPayload
) {
  const theme = getStoryTheme(data.themeId);
  const dur = STORY_DURATION_SEC;
  const loopT = ((tSec % dur) + dur) % dur;
  const phase = (loopT / dur) * Math.PI * 2; // Seamless 0..2π loop phase

  const rainProb = Math.max(0, Math.min(100, Math.round(data.rainProbability ?? 0)));
  const precipMm = data.precipitationMm ?? 0;
  const heavyProb = data.heavyRainProbability ?? null;
  const rainUnit = data.rainUnit ?? "mm";
  const windUnit = data.windUnit ?? "kmh";
  const risk = getRainRiskBadge(data.rainProbability, data.precipitationMm, data.weatherCategory);

  // 1. Seamless animated atmospheric background gradient
  const drift = Math.sin(phase) * 90;
  const grad = ctx.createLinearGradient(0, drift, w, h + drift);
  grad.addColorStop(0, theme.bgStops[0]);
  grad.addColorStop(0.5, theme.bgStops[1]);
  grad.addColorStop(1, theme.bgStops[2]);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // 2. Continuous animated weather effects (drifting clouds, rain streaks, lightning, wind)
  // Always ensure subtle rain streaks if rainProb >= 25% so rain stories feel alive
  const effectCategory =
    data.weatherCategory === "thunderstorm"
      ? "thunderstorm"
      : data.weatherCategory === "heavy_rain" || precipMm >= 20
      ? "heavy_rain"
      : rainProb >= 25 || precipMm >= 0.5
      ? "rain"
      : data.weatherCategory;
  drawWeatherEffects(ctx, w, h, loopT, effectCategory, theme);

  const padX = 52;
  const cardW = w - padX * 2;

  // =========================================================================
  // TOP HEADER BAR (VAANAM AI • RAIN OUTLOOK + DATE)
  // =========================================================================
  ctx.fillStyle = theme.cardBg;
  ctx.strokeStyle = theme.cardBorder;
  ctx.lineWidth = 2;
  drawRoundedRect(ctx, padX, 58, cardW, 84, 26);
  ctx.fill();
  ctx.stroke();

  // Pulsing live dot
  const pulseR = 9 + Math.sin(phase * 2) * 3;
  ctx.beginPath();
  ctx.arc(padX + 34, 100, pulseR, 0, Math.PI * 2);
  ctx.fillStyle = `${theme.accent}44`;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(padX + 34, 100, 6, 0, Math.PI * 2);
  ctx.fillStyle = theme.accent;
  ctx.fill();

  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillStyle = theme.accent;
  ctx.font = "800 26px sans-serif";
  ctx.fillText("VAANAM AI  •  RAIN FORECAST", padX + 56, 100);

  ctx.textAlign = "right";
  ctx.fillStyle = theme.textSecondary;
  ctx.font = "700 24px sans-serif";
  ctx.fillText(data.dateLabel.toUpperCase(), w - padX - 28, 100);

  // =========================================================================
  // LOCATION + ANIMATED RAIN/WEATHER ICON HERO HEADER
  // =========================================================================
  const heroY = 178;
  ctx.textAlign = "left";
  ctx.fillStyle = theme.textPrimary;
  ctx.font = "900 76px sans-serif";
  ctx.fillText(data.city.toUpperCase(), padX + 6, heroY + 46, cardW - 220);

  ctx.fillStyle = theme.textSecondary;
  ctx.font = "600 30px sans-serif";
  ctx.fillText(data.region, padX + 8, heroY + 104, cardW - 220);

  // Risk Pill + Temp Pill inline
  ctx.font = "800 22px sans-serif";
  const riskW = ctx.measureText(risk.label).width + 38;
  drawRoundedRect(ctx, padX + 6, heroY + 132, riskW, 46, 23);
  ctx.fillStyle = risk.bg;
  ctx.fill();
  ctx.fillStyle = risk.color;
  ctx.fillText(risk.label, padX + 25, heroY + 155);

  const tempRangeStr = `${fmtTemp(data.tempMinC, data.tempUnit)} – ${fmtTemp(data.tempMaxC, data.tempUnit)}`;
  const tempPillX = padX + 6 + riskW + 16;
  ctx.font = "700 22px sans-serif";
  const tempPillW = ctx.measureText(tempRangeStr).width + 36;
  drawRoundedRect(ctx, tempPillX, heroY + 132, tempPillW, 46, 23);
  ctx.fillStyle = "rgba(15, 23, 42, 0.55)";
  ctx.fill();
  ctx.strokeStyle = theme.cardBorder;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = theme.textPrimary;
  ctx.fillText(tempRangeStr, tempPillX + 18, heroY + 155);

  // Animated Weather Icon on right
  drawWeatherIcon(ctx, w - padX - 96, heroY + 86, 136, effectCategory, theme.accent, loopT);

  // =========================================================================
  // MAIN RAIN METRICS CARD (Rain Chance + Animated Bar + Expected Rainfall + Heavy Rain Risk)
  // =========================================================================
  const mainY = 398;
  const mainH = 382;
  ctx.fillStyle = theme.cardBg;
  ctx.strokeStyle = theme.cardBorder;
  ctx.lineWidth = 2;
  drawRoundedRect(ctx, padX, mainY, cardW, mainH, 34);
  ctx.fill();
  ctx.stroke();

  // Subtle animated shimmer sweep across top border
  const shimmerX = padX + ((loopT / dur) * (cardW + 260)) - 130;
  ctx.save();
  const shimGrad = ctx.createLinearGradient(shimmerX - 90, mainY, shimmerX + 90, mainY);
  shimGrad.addColorStop(0, "rgba(255,255,255,0)");
  shimGrad.addColorStop(0.5, `${theme.accent}aa`);
  shimGrad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.strokeStyle = shimGrad;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(Math.max(padX + 34, shimmerX - 90), mainY + 1);
  ctx.lineTo(Math.min(padX + cardW - 34, shimmerX + 90), mainY + 1);
  ctx.stroke();
  ctx.restore();

  // Left side: Big Rain Probability
  ctx.textAlign = "left";
  ctx.fillStyle = theme.accent;
  ctx.font = "800 24px sans-serif";
  ctx.fillText("RAIN PROBABILITY", padX + 38, mainY + 50);

  ctx.fillStyle = theme.textPrimary;
  ctx.font = "900 132px sans-serif";
  ctx.fillText(`${rainProb}%`, padX + 36, mainY + 148);

  ctx.fillStyle = theme.textSecondary;
  ctx.font = "600 24px sans-serif";
  ctx.fillText(data.conditionLabel, padX + 38, mainY + 230);

  // Right side: Expected Rainfall + Heavy Rain Risk stacked
  const rightColX = padX + cardW * 0.52;
  const rightColW = cardW * 0.48 - 36;

  drawRoundedRect(ctx, rightColX, mainY + 34, rightColW, 102, 22);
  ctx.fillStyle = "rgba(4, 10, 24, 0.55)";
  ctx.fill();
  ctx.strokeStyle = `${theme.accent}44`;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = theme.textSecondary;
  ctx.font = "700 20px sans-serif";
  ctx.fillText("EXPECTED RAINFALL", rightColX + 22, mainY + 64);

  ctx.fillStyle = theme.accent;
  ctx.font = "900 46px sans-serif";
  ctx.fillText(fmtRainAmt(precipMm, rainUnit), rightColX + 22, mainY + 108);

  drawRoundedRect(ctx, rightColX, mainY + 150, rightColW, 102, 22);
  ctx.fillStyle = "rgba(4, 10, 24, 0.55)";
  ctx.fill();
  ctx.strokeStyle = theme.cardBorder;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = theme.textSecondary;
  ctx.font = "700 20px sans-serif";
  ctx.fillText("HEAVY RAIN RISK", rightColX + 22, mainY + 180);

  ctx.fillStyle = theme.textPrimary;
  ctx.font = "900 44px sans-serif";
  ctx.fillText(
    heavyProb !== null ? `${Math.round(heavyProb)}%` : precipMm >= 25 ? "ELEVATED" : "LOW",
    rightColX + 22,
    mainY + 224
  );

  // Animated Rain Intensity Progress Bar across bottom of main card
  const barX = padX + 38;
  const barY = mainY + 292;
  const barW = cardW - 76;
  const barH = 26;

  ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
  drawRoundedRect(ctx, barX, barY, barW, barH, 13);
  ctx.fill();

  const fillFrac = Math.max(0.05, rainProb / 100);
  const pulseFill = Math.min(1, fillFrac + Math.sin(phase * 2) * 0.012);
  const barGrad = ctx.createLinearGradient(barX, barY, barX + barW * pulseFill, barY);
  barGrad.addColorStop(0, theme.accentSecondary);
  barGrad.addColorStop(1, theme.accent);
  ctx.fillStyle = barGrad;
  drawRoundedRect(ctx, barX, barY, Math.max(26, barW * pulseFill), barH, 13);
  ctx.fill();

  ctx.fillStyle = theme.textSecondary;
  ctx.font = "600 20px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("0% Dry", barX, barY + 50);
  ctx.textAlign = "center";
  ctx.fillText("50% Moderate", barX + barW / 2, barY + 50);
  ctx.textAlign = "right";
  ctx.fillText("100% Heavy", barX + barW, barY + 50);

  // =========================================================================
  // SUPPORTING RAIN TELEMETRY STRIP (Wind, Humidity, Confidence)
  // =========================================================================
  const subY = 812;
  const subH = 164;
  const subGap = 20;
  const subW = (cardW - subGap * 2) / 3;

  const subCards = [
    {
      label: "WIND SPEED",
      value: fmtWindAmt(data.windKmh, windUnit),
      sub: "Peak gusts / wind",
    },
    {
      label: "HUMIDITY",
      value: data.humidityPct !== null ? `${Math.round(data.humidityPct)}%` : "—",
      sub: "Moisture level",
    },
    {
      label: "CONFIDENCE",
      value: data.confidence,
      sub: "ECMWF ENS 51",
    },
  ];

  subCards.forEach((sc, idx) => {
    const sx = padX + idx * (subW + subGap);
    ctx.fillStyle = theme.cardBg;
    ctx.strokeStyle = theme.cardBorder;
    ctx.lineWidth = 2;
    drawRoundedRect(ctx, sx, subY, subW, subH, 26);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = "left";
    ctx.fillStyle = theme.textSecondary;
    ctx.font = "700 20px sans-serif";
    ctx.fillText(sc.label, sx + 26, subY + 40);

    ctx.fillStyle = idx === 2 ? theme.accent : theme.textPrimary;
    ctx.font = "900 44px sans-serif";
    ctx.fillText(sc.value, sx + 26, subY + 94, subW - 44);

    ctx.fillStyle = theme.textSecondary;
    ctx.font = "600 20px sans-serif";
    ctx.fillText(sc.sub, sx + 26, subY + 136, subW - 44);
  });

  // =========================================================================
  // HOURLY RAIN TIMELINE CARD (Animated Rain Bars for Key Hours)
  // =========================================================================
  const tlY = 1008;
  const tlH = 420;
  ctx.fillStyle = theme.cardBg;
  ctx.strokeStyle = theme.cardBorder;
  ctx.lineWidth = 2;
  drawRoundedRect(ctx, padX, tlY, cardW, tlH, 32);
  ctx.fill();
  ctx.stroke();

  ctx.textAlign = "left";
  ctx.fillStyle = theme.accent;
  ctx.font = "800 24px sans-serif";
  ctx.fillText("HOURLY RAIN TIMELINE", padX + 36, tlY + 46);

  ctx.textAlign = "right";
  ctx.fillStyle = theme.textSecondary;
  ctx.font = "600 21px sans-serif";
  ctx.fillText("Rain Chance • Rainfall • Temp", padX + cardW - 36, tlY + 46);

  const items = data.timelinePreview.slice(0, 5);
  if (items.length > 0) {
    const innerPad = 36;
    const colW = (cardW - innerPad * 2) / items.length;
    const chartBottom = tlY + 292;
    const maxBarH = 148;

    items.forEach((it, idx) => {
      const cx = padX + innerPad + colW * idx + colW / 2;
      const pct = Math.max(0, Math.min(100, it.rainPct));

      // Gentle wave animation on each hourly rain bar
      const wave = 1 + Math.sin(phase * 2 - idx * 0.7) * 0.04;
      const barHeight = Math.max(14, (pct / 100) * maxBarH * wave);
      const bw = Math.min(64, colW * 0.48);

      // Bar background track
      ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
      drawRoundedRect(ctx, cx - bw / 2, chartBottom - maxBarH, bw, maxBarH, 14);
      ctx.fill();

      // Animated rain fill bar
      const bGrad = ctx.createLinearGradient(cx, chartBottom - barHeight, cx, chartBottom);
      bGrad.addColorStop(0, theme.accent);
      bGrad.addColorStop(1, theme.accentSecondary);
      ctx.fillStyle = bGrad;
      drawRoundedRect(ctx, cx - bw / 2, chartBottom - barHeight, bw, barHeight, 14);
      ctx.fill();

      // Rain % above bar
      ctx.textAlign = "center";
      ctx.fillStyle = theme.textPrimary;
      ctx.font = "800 28px sans-serif";
      ctx.fillText(`${pct}%`, cx, chartBottom - maxBarH - 22);

      // Time label
      ctx.fillStyle = theme.accent;
      ctx.font = "700 24px sans-serif";
      ctx.fillText(it.label, cx, chartBottom + 34);

      // Rainfall amount & Temp
      ctx.fillStyle = theme.textSecondary;
      ctx.font = "600 21px sans-serif";
      const mmText =
        typeof it.precipMm === "number" ? fmtRainAmt(it.precipMm, rainUnit) : it.temp;
      ctx.fillText(mmText, cx, chartBottom + 68);

      ctx.fillStyle = theme.textPrimary;
      ctx.font = "700 22px sans-serif";
      ctx.fillText(it.temp, cx, chartBottom + 98);
    });
  }

  // =========================================================================
  // RAIN BRIEFING & ACTION ADVISORY CARD
  // =========================================================================
  const sumY = 1460;
  const sumH = 310;
  ctx.fillStyle = theme.cardBg;
  ctx.strokeStyle = theme.cardBorder;
  ctx.lineWidth = 2;
  drawRoundedRect(ctx, padX, sumY, cardW, sumH, 32);
  ctx.fill();
  ctx.stroke();

  ctx.textAlign = "left";
  ctx.fillStyle = theme.accent;
  ctx.font = "800 24px sans-serif";
  ctx.fillText("RAIN BRIEFING & ADVISORY", padX + 36, sumY + 46);

  ctx.fillStyle = theme.textPrimary;
  ctx.font = "600 32px sans-serif";
  wrapText(ctx, data.shortSummary, padX + 36, sumY + 96, cardW - 72, 44, 4);

  ctx.fillStyle = theme.textSecondary;
  ctx.font = "600 21px sans-serif";
  ctx.fillText(
    "ECMWF IFS 0.25° & ENS 51-Member Model • Follow official local advisories",
    padX + 36,
    sumY + sumH - 34
  );

  // =========================================================================
  // PERSISTENT BOTTOM FOOTER
  // =========================================================================
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.font = "700 24px sans-serif";
  ctx.fillText(`${data.city.toUpperCase()}  •  POWERED BY VAANAM AI`, w / 2, h - 68);
}
