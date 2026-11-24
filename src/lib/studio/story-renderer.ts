import { getStoryTheme } from "./themes";
import { StoryThemeId } from "@/types/weather";

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
  precipitationMm: number | null;
  windKmh: number | null;
  humidityPct: number | null;
  confidence: "HIGH" | "MODERATE" | "LOW";
  tempUnit: "C" | "F";
  themeId: StoryThemeId;
  designVariant: number; // 0, 1, 2
  timelinePreview: Array<{ label: string; temp: string; rainPct: number }>;
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

/**
 * Renders one frame at time `tSec` (0.0 to 10.0) of the 10-second 9:16 Instagram Story.
 * Exact 10-second narrative structure:
 *   0–2s: Location reveal & dramatic weather introduction
 *   2–5s: Weather condition animation & animated temperature reveal
 *   5–8s: Rain probability, wind & forecast timeline
 *   8–10s: Closing animation, VAANAM AI branding & weather awareness prompt
 */
export function renderStoryFrame(
  ctx: Canvas2DLike,
  w: number,
  h: number,
  tSec: number,
  data: StoryRenderPayload
) {
  const theme = getStoryTheme(data.themeId);
  const clampedT = Math.max(0, Math.min(10, tSec));

  // Background gradient with subtle drift
  const drift = Math.sin(clampedT * 0.5) * 120;
  const grad = ctx.createLinearGradient(0, drift, w, h + drift);
  grad.addColorStop(0, theme.bgStops[0]);
  grad.addColorStop(0.5, theme.bgStops[1]);
  grad.addColorStop(1, theme.bgStops[2]);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Live animated weather effects (clouds, rain, lightning, wind, radar)
  drawWeatherEffects(ctx, w, h, clampedT, data.weatherCategory, theme);

  // Top Story Progress Bar (10s live progress)
  ctx.fillStyle = "rgba(255,255,255,0.2)";
  drawRoundedRect(ctx, 48, 56, w - 96, 10, 5);
  ctx.fill();
  ctx.fillStyle = theme.accent;
  drawRoundedRect(ctx, 48, 56, (w - 96) * (clampedT / 10), 10, 5);
  ctx.fill();

  // Persistent Top Brand Pill
  ctx.fillStyle = theme.cardBg;
  ctx.strokeStyle = theme.cardBorder;
  ctx.lineWidth = 2;
  drawRoundedRect(ctx, 48, 96, w - 96, 86, 28);
  ctx.fill();
  ctx.stroke();

  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillStyle = theme.accent;
  ctx.font = "800 28px sans-serif";
  ctx.fillText("VAANAM AI", 84, 139);

  ctx.textAlign = "right";
  ctx.fillStyle = theme.textSecondary;
  ctx.font = "600 24px sans-serif";
  ctx.fillText(`${data.dateLabel.toUpperCase()} • LIVE MODEL`, w - 84, 139);

  // Helper for smooth fade-in/out per scene
  const sceneAlpha = (start: number, end: number) => {
    if (clampedT < start || clampedT > end) return 0;
    const fadeIn = Math.min(1, (clampedT - start) / 0.45);
    const fadeOut = end >= 10 ? 1 : Math.min(1, (end - clampedT) / 0.4);
    return Math.max(0, Math.min(fadeIn, fadeOut));
  };

  // SCENE 1 (0–2.3s): Location Reveal & Dramatic Weather Introduction
  const a1 = sceneAlpha(0, 2.35);
  if (a1 > 0.01) {
    ctx.save();
    ctx.globalAlpha = a1;
    const slideY = (1 - Math.min(1, clampedT / 0.6)) * 60;

    drawWeatherIcon(ctx, w / 2, h * 0.34 + slideY, 190, data.weatherCategory, theme.accent, clampedT);

    ctx.textAlign = "center";
    ctx.fillStyle = theme.accent;
    ctx.font = "700 32px sans-serif";
    ctx.fillText("WEATHER INTELLIGENCE BRIEFING", w / 2, h * 0.49 + slideY);

    ctx.fillStyle = theme.textPrimary;
    ctx.font = "900 104px sans-serif";
    ctx.fillText(data.city.toUpperCase(), w / 2, h * 0.56 + slideY, w - 110);

    ctx.fillStyle = theme.textSecondary;
    ctx.font = "600 38px sans-serif";
    ctx.fillText(data.region, w / 2, h * 0.62 + slideY, w - 120);

    ctx.fillStyle = theme.cardBg;
    ctx.strokeStyle = theme.cardBorder;
    drawRoundedRect(ctx, 84, h * 0.68 + slideY, w - 168, 130, 32);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = theme.textPrimary;
    ctx.font = "700 38px sans-serif";
    ctx.fillText(data.conditionLabel.toUpperCase(), w / 2, h * 0.715 + slideY, w - 220);
    ctx.restore();
  }

  // SCENE 2 (2.0–5.3s): Weather Condition Animation & Animated Temperature Reveal
  const a2 = sceneAlpha(2.0, 5.35);
  if (a2 > 0.01) {
    ctx.save();
    ctx.globalAlpha = a2;
    const progress = Math.min(1, Math.max(0, (clampedT - 2.0) / 1.2));

    ctx.textAlign = "center";
    ctx.fillStyle = theme.textSecondary;
    ctx.font = "700 32px sans-serif";
    ctx.fillText(`${data.city.toUpperCase()} • TEMPERATURE OUTLOOK`, w / 2, h * 0.23);

    drawWeatherIcon(ctx, w / 2, h * 0.35, 180, data.weatherCategory, theme.accent, clampedT);

    // Animated counting temperature
    const targetMax = data.tempMaxC ?? data.currentTempC ?? 30;
    const animTemp = Math.round(targetMax * (0.4 + 0.6 * progress));
    const displayAnim =
      data.tempUnit === "F" ? `${Math.round((animTemp * 9) / 5 + 32)}°F` : `${animTemp}°C`;

    ctx.fillStyle = theme.textPrimary;
    ctx.font = "900 176px sans-serif";
    ctx.fillText(displayAnim, w / 2, h * 0.54);

    // Min / Max Pill
    ctx.fillStyle = theme.cardBg;
    ctx.strokeStyle = theme.cardBorder;
    drawRoundedRect(ctx, 110, h * 0.63, w - 220, 136, 36);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = theme.accent;
    ctx.font = "700 34px sans-serif";
    ctx.fillText(
      `LOW ${fmtTemp(data.tempMinC, data.tempUnit)}   •   HIGH ${fmtTemp(data.tempMaxC, data.tempUnit)}`,
      w / 2,
      h * 0.665
    );
    ctx.fillStyle = theme.textPrimary;
    ctx.font = "600 30px sans-serif";
    ctx.fillText(data.conditionLabel, w / 2, h * 0.705);
    ctx.restore();
  }

  // SCENE 3 (5.0–8.3s): Rain Probability, Wind & Live-Feeling Forecast Timeline
  const a3 = sceneAlpha(5.0, 8.35);
  if (a3 > 0.01) {
    ctx.save();
    ctx.globalAlpha = a3;

    ctx.textAlign = "center";
    ctx.fillStyle = theme.accent;
    ctx.font = "800 34px sans-serif";
    ctx.fillText("KEY FORECAST PARAMETERS", w / 2, h * 0.22);

    const rows = [
      {
        label: "RAIN PROBABILITY (ECMWF ENS)",
        value: data.rainProbability !== null ? `${data.rainProbability}%` : "—",
        sub: data.precipitationMm !== null ? `${data.precipitationMm.toFixed(1)} mm expected` : "",
      },
      {
        label: "PEAK WIND SPEED",
        value: data.windKmh !== null ? `${Math.round(data.windKmh)} km/h` : "—",
        sub: data.humidityPct !== null ? `Humidity ${data.humidityPct}%` : "",
      },
      {
        label: "ENSEMBLE CONFIDENCE",
        value: data.confidence,
        sub: "Based on 51-member ECMWF ENS spread",
      },
    ];

    rows.forEach((row, idx) => {
      const y = h * 0.28 + idx * 215;
      ctx.fillStyle = theme.cardBg;
      ctx.strokeStyle = theme.cardBorder;
      drawRoundedRect(ctx, 64, y, w - 128, 182, 30);
      ctx.fill();
      ctx.stroke();

      ctx.textAlign = "left";
      ctx.fillStyle = theme.textSecondary;
      ctx.font = "700 24px sans-serif";
      ctx.fillText(row.label, 104, y + 48);

      ctx.fillStyle = theme.textPrimary;
      ctx.font = "900 62px sans-serif";
      ctx.fillText(row.value, 104, y + 112);

      if (row.sub) {
        ctx.textAlign = "right";
        ctx.fillStyle = theme.accent;
        ctx.font = "600 26px sans-serif";
        ctx.fillText(row.sub, w - 104, y + 118);
      }
    });

    // Mini Forecast Timeline strip
    if (data.timelinePreview.length > 0) {
      const stripY = h * 0.67;
      ctx.fillStyle = theme.cardBg;
      ctx.strokeStyle = theme.cardBorder;
      drawRoundedRect(ctx, 64, stripY, w - 128, 220, 30);
      ctx.fill();
      ctx.stroke();

      ctx.textAlign = "left";
      ctx.fillStyle = theme.accent;
      ctx.font = "700 24px sans-serif";
      ctx.fillText("HOURLY TIMELINE", 104, stripY + 46);

      const items = data.timelinePreview.slice(0, 4);
      const colW = (w - 208) / Math.max(items.length, 1);
      items.forEach((it, idx) => {
        const cx = 104 + colW * idx + colW / 2;
        ctx.textAlign = "center";
        ctx.fillStyle = theme.textSecondary;
        ctx.font = "600 26px sans-serif";
        ctx.fillText(it.label, cx, stripY + 98);
        ctx.fillStyle = theme.textPrimary;
        ctx.font = "800 38px sans-serif";
        ctx.fillText(it.temp, cx, stripY + 146);
        ctx.fillStyle = theme.accent;
        ctx.font = "600 24px sans-serif";
        ctx.fillText(`${it.rainPct}% rain`, cx, stripY + 186);
      });
    }
    ctx.restore();
  }

  // SCENE 4 (8.0–10.0s): Closing Animation, VAANAM AI Branding & Share Prompt
  const a4 = sceneAlpha(8.0, 10.0);
  if (a4 > 0.01) {
    ctx.save();
    ctx.globalAlpha = a4;

    ctx.textAlign = "center";
    ctx.fillStyle = theme.accent;
    ctx.font = "900 84px sans-serif";
    ctx.fillText("VAANAM AI", w / 2, h * 0.38);

    ctx.fillStyle = theme.textPrimary;
    ctx.font = "700 36px sans-serif";
    ctx.fillText("REAL DATA. CLEAR FORECASTS.", w / 2, h * 0.44);

    ctx.fillStyle = theme.cardBg;
    ctx.strokeStyle = theme.cardBorder;
    drawRoundedRect(ctx, 84, h * 0.51, w - 168, 240, 36);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = theme.textPrimary;
    ctx.font = "600 34px sans-serif";
    wrapText(ctx, data.shortSummary, w / 2, h * 0.565, w - 230, 46, 3);

    ctx.fillStyle = theme.accent;
    ctx.font = "700 30px sans-serif";
    ctx.fillText("STAY WEATHER-AWARE • SHARE THIS UPDATE", w / 2, h * 0.72);

    ctx.fillStyle = theme.textSecondary;
    ctx.font = "500 22px sans-serif";
    ctx.fillText("Model data: ECMWF IFS & ENS • Follow IMD for official warnings", w / 2, h * 0.77);
    ctx.restore();
  }

  // Persistent Bottom Footer
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(255,255,255,0.65)";
  ctx.font = "600 22px sans-serif";
  ctx.fillText(`${data.city} • Powered by VAANAM AI`, w / 2, h - 62);
}
