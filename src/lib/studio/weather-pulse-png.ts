import { selectTopTimelineEvents } from "@/lib/models/weather-pulse";
import { formatRain, formatTemp, formatWind, windDirectionToCompass } from "@/lib/units";
import { getWeatherCodeInfo } from "@/lib/weather-codes";
import {
  TimelineEventKind,
  TimelineSourceType,
  UserSettings,
  WeatherIntelligencePayload,
  WeatherPulseSummary,
} from "@/types/weather";

const WIDTH = 1080;
const HEIGHT = 1350;

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines = 2
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
      if (lines.length >= maxLines) break;
    } else {
      current = test;
    }
  }
  if (current && lines.length < maxLines) {
    lines.push(current);
  }
  if (lines.length === maxLines && words.join(" ").length > lines.join(" ").length + 3) {
    const last = lines[maxLines - 1];
    lines[maxLines - 1] = last.length > 3 ? `${last.slice(0, -1)}…` : `${last}…`;
  }
  return lines;
}

function getKindVisuals(kind: TimelineEventKind): {
  accent: string;
  bg: string;
  emoji: string;
} {
  switch (kind) {
    case "thunderstorm":
      return { accent: "#c084fc", bg: "rgba(139, 92, 246, 0.16)", emoji: "⛈️" };
    case "heavy_rain":
      return { accent: "#60a5fa", bg: "rgba(59, 130, 246, 0.16)", emoji: "🌧️" };
    case "rain":
      return { accent: "#22d3ee", bg: "rgba(34, 211, 238, 0.14)", emoji: "🌦️" };
    case "wind":
      return { accent: "#38bdf8", bg: "rgba(56, 189, 248, 0.14)", emoji: "💨" };
    case "clouds":
      return { accent: "#94a3b8", bg: "rgba(148, 163, 184, 0.14)", emoji: "☁️" };
    case "temperature":
      return { accent: "#fbbf24", bg: "rgba(251, 191, 36, 0.14)", emoji: "🌡️" };
    case "clearing":
      return { accent: "#34d399", bg: "rgba(52, 211, 153, 0.14)", emoji: "🌤️" };
  }
}

function getSourceBadge(sourceType: TimelineSourceType): {
  label: string;
  color: string;
  bg: string;
} {
  switch (sourceType) {
    case "radar_observation":
      return { label: "RADAR OBS", color: "#6ee7b7", bg: "rgba(16, 185, 129, 0.22)" };
    case "radar_estimate":
      return { label: "RADAR ESTIMATE", color: "#67e8f9", bg: "rgba(6, 182, 212, 0.22)" };
    case "model_forecast":
      return { label: "MODEL FORECAST", color: "#93c5fd", bg: "rgba(59, 130, 246, 0.22)" };
  }
}

function getConfidenceColor(conf: "HIGH" | "MODERATE" | "LOW"): string {
  if (conf === "HIGH") return "#34d399";
  if (conf === "MODERATE") return "#38bdf8";
  return "#fbbf24";
}

/**
 * Renders the 1080 × 1350 VAANAM AI Weather Pulse + Upcoming Weather Timeline graphic
 * onto an HTMLCanvasElement.
 */
export function renderWeatherPulsePng(
  canvas: HTMLCanvasElement,
  payload: WeatherIntelligencePayload,
  pulse: WeatherPulseSummary,
  settings: UserSettings,
  horizonHours: 3 | 6
): void {
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const { location, current } = payload;
  const curInfo = getWeatherCodeInfo(current.weatherCode);

  // 1. Deep Navy & Cyan Atmospheric Background
  const bgGrad = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  bgGrad.addColorStop(0, "#040914");
  bgGrad.addColorStop(0.5, "#081732");
  bgGrad.addColorStop(1, "#030812");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Subtle radial cyan glow (top-right)
  const glow1 = ctx.createRadialGradient(WIDTH - 120, 140, 20, WIDTH - 120, 140, 420);
  glow1.addColorStop(0, "rgba(34, 211, 238, 0.22)");
  glow1.addColorStop(1, "rgba(34, 211, 238, 0)");
  ctx.fillStyle = glow1;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Subtle radial blue glow (bottom-left)
  const glow2 = ctx.createRadialGradient(140, HEIGHT - 200, 20, 140, HEIGHT - 200, 460);
  glow2.addColorStop(0, "rgba(56, 189, 248, 0.14)");
  glow2.addColorStop(1, "rgba(56, 189, 248, 0)");
  ctx.fillStyle = glow2;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Outer card frame
  drawRoundedRect(ctx, 28, 28, WIDTH - 56, HEIGHT - 56, 36);
  ctx.strokeStyle = "rgba(34, 211, 238, 0.28)";
  ctx.lineWidth = 2;
  ctx.stroke();

  const padX = 64;
  const innerW = WIDTH - padX * 2;

  // =========================================================================
  // A. HEADER
  // =========================================================================
  let y = 84;

  // Brand badge
  ctx.fillStyle = "#22d3ee";
  ctx.font = "800 22px system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.fillText("VAANAM AI  •  WEATHER PULSE", padX, y);

  // Status indicator pill on right
  const statusText = pulse.statusLabel;
  ctx.font = "700 18px system-ui, -apple-system, Segoe UI, sans-serif";
  const statusW = ctx.measureText(statusText).width + 46;
  drawRoundedRect(ctx, WIDTH - padX - statusW, y - 26, statusW, 38, 19);
  ctx.fillStyle =
    pulse.statusMode === "LIVE_RADAR"
      ? "rgba(16, 185, 129, 0.2)"
      : pulse.statusMode === "NOWCAST"
      ? "rgba(34, 211, 238, 0.2)"
      : "rgba(59, 130, 246, 0.2)";
  ctx.fill();
  ctx.strokeStyle =
    pulse.statusMode === "LIVE_RADAR"
      ? "rgba(52, 211, 153, 0.6)"
      : "rgba(56, 189, 248, 0.55)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Status dot
  ctx.beginPath();
  ctx.arc(WIDTH - padX - statusW + 20, y - 7, 5, 0, Math.PI * 2);
  ctx.fillStyle = pulse.statusMode === "LIVE_RADAR" ? "#34d399" : "#22d3ee";
  ctx.fill();

  ctx.fillStyle = "#e2e8f0";
  ctx.fillText(statusText, WIDTH - padX - statusW + 34, y - 1);

  // Location & Timestamp
  y += 58;
  ctx.fillStyle = "#ffffff";
  ctx.font = "800 48px system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.fillText(location.name, padX, y);

  y += 32;
  const regionStr = [location.district, location.state, location.country]
    .filter(Boolean)
    .join(", ");
  ctx.fillStyle = "#94a3b8";
  ctx.font = "500 22px system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.fillText(
    `${regionStr}  •  Updated ${pulse.lastUpdatedLocal} (${location.timezone})`,
    padX,
    y
  );

  // Divider
  y += 24;
  ctx.strokeStyle = "rgba(148, 163, 184, 0.16)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(padX, y);
  ctx.lineTo(WIDTH - padX, y);
  ctx.stroke();

  // =========================================================================
  // B. MAIN WEATHER ALERT
  // =========================================================================
  y += 26;
  const alertBoxH = 228;
  drawRoundedRect(ctx, padX, y, innerW, alertBoxH, 26);
  const alertGrad = ctx.createLinearGradient(padX, y, padX + innerW, y + alertBoxH);
  alertGrad.addColorStop(0, "rgba(14, 165, 233, 0.16)");
  alertGrad.addColorStop(1, "rgba(15, 23, 42, 0.72)");
  ctx.fillStyle = alertGrad;
  ctx.fill();
  ctx.strokeStyle = "rgba(34, 211, 238, 0.32)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Left: Large weather icon + temp
  ctx.font = "72px system-ui, Apple Color Emoji, Segoe UI Emoji, sans-serif";
  ctx.fillText(curInfo.emoji, padX + 28, y + 102);

  ctx.fillStyle = "#ffffff";
  ctx.font = "800 54px system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.fillText(formatTemp(current.temperature, settings.tempUnit), padX + 28, y + 178);

  ctx.fillStyle = "#94a3b8";
  ctx.font = "600 18px system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.fillText(curInfo.shortLabel, padX + 28, y + 206);

  // Right: Headline, arrival pill, explanation, action
  const textX = padX + 210;
  const textW = innerW - 238;

  ctx.fillStyle = "#ffffff";
  ctx.font = "800 34px system-ui, -apple-system, Segoe UI, sans-serif";
  const headlineLines = wrapText(ctx, pulse.headline, textW, 2);
  let textY = y + 48;
  for (const line of headlineLines) {
    ctx.fillText(line, textX, textY);
    textY += 40;
  }

  if (pulse.arrivalEstimate) {
    ctx.font = "700 19px system-ui, -apple-system, Segoe UI, sans-serif";
    const etaW = Math.min(textW, ctx.measureText(`⏱ ${pulse.arrivalEstimate}`).width + 28);
    drawRoundedRect(ctx, textX, textY - 22, etaW, 32, 16);
    ctx.fillStyle = "rgba(34, 211, 238, 0.2)";
    ctx.fill();
    ctx.fillStyle = "#67e8f9";
    ctx.fillText(`⏱ ${pulse.arrivalEstimate}`, textX + 14, textY);
    textY += 32;
  }

  ctx.fillStyle = "#cbd5e1";
  ctx.font = "500 21px system-ui, -apple-system, Segoe UI, sans-serif";
  const expLines = wrapText(ctx, pulse.explanation, textW, 2);
  for (const line of expLines) {
    ctx.fillText(line, textX, textY + 6);
    textY += 27;
  }

  ctx.fillStyle = "#22d3ee";
  ctx.font = "600 19px system-ui, -apple-system, Segoe UI, sans-serif";
  const actLines = wrapText(ctx, `Tip: ${pulse.actionRecommendation}`, textW, 1);
  if (actLines[0]) {
    ctx.fillText(actLines[0], textX, y + alertBoxH - 18);
  }

  // =========================================================================
  // C. WEATHER METRICS (5 Cards)
  // =========================================================================
  y += alertBoxH + 22;
  const metricGap = 14;
  const metricW = (innerW - metricGap * 4) / 5;
  const metricH = 112;

  const metrics = [
    {
      label: "RAIN PROB",
      value:
        pulse.maxRainProbNext6h !== null
          ? `${pulse.maxRainProbNext6h}%`
          : current.rainProbability !== null
          ? `${current.rainProbability}%`
          : "—",
      sub: "Next 6h peak",
      color: "#22d3ee",
    },
    {
      label: "EXPECTED RAIN",
      value: formatRain(pulse.expectedRainNext6hMm, settings.rainUnit),
      sub: "Next 6h total",
      color: "#60a5fa",
    },
    {
      label: "TEMPERATURE",
      value: formatTemp(current.temperature, settings.tempUnit),
      sub: `Feels ${formatTemp(current.feelsLike, settings.tempUnit)}`,
      color: "#fbbf24",
    },
    {
      label: "WIND",
      value: formatWind(current.windSpeed, settings.windUnit),
      sub: `Dir: ${windDirectionToCompass(current.windDirection)}`,
      color: "#38bdf8",
    },
    {
      label: "CONFIDENCE",
      value: pulse.confidence,
      sub: payload.comparison.agreementLevel,
      color: getConfidenceColor(pulse.confidence),
    },
  ];

  metrics.forEach((m, idx) => {
    const mx = padX + idx * (metricW + metricGap);
    drawRoundedRect(ctx, mx, y, metricW, metricH, 18);
    ctx.fillStyle = "rgba(8, 18, 38, 0.82)";
    ctx.fill();
    ctx.strokeStyle = "rgba(148, 163, 184, 0.2)";
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.fillStyle = "#94a3b8";
    ctx.font = "700 14px system-ui, -apple-system, Segoe UI, sans-serif";
    ctx.fillText(m.label, mx + 16, y + 30);

    ctx.fillStyle = m.color;
    ctx.font = "800 28px system-ui, -apple-system, Segoe UI, sans-serif";
    ctx.fillText(m.value, mx + 16, y + 68);

    ctx.fillStyle = "#94a3b8";
    ctx.font = "500 15px system-ui, -apple-system, Segoe UI, sans-serif";
    ctx.fillText(m.sub, mx + 16, y + 95);
  });

  // =========================================================================
  // D. UPCOMING WEATHER TIMELINE (Top 3-4 most significant events)
  // =========================================================================
  y += metricH + 36;

  ctx.fillStyle = "#22d3ee";
  ctx.font = "800 22px system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.fillText("UPCOMING WEATHER TIMELINE", padX, y);

  // Horizon pill on right
  const horizonText = `NEXT ${horizonHours} HOURS`;
  ctx.font = "700 16px system-ui, -apple-system, Segoe UI, sans-serif";
  const hzW = ctx.measureText(horizonText).width + 28;
  drawRoundedRect(ctx, WIDTH - padX - hzW, y - 22, hzW, 30, 15);
  ctx.fillStyle = "rgba(34, 211, 238, 0.16)";
  ctx.fill();
  ctx.fillStyle = "#67e8f9";
  ctx.fillText(horizonText, WIDTH - padX - hzW + 14, y - 2);

  y += 28;
  ctx.fillStyle = "#94a3b8";
  ctx.font = "500 20px system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.fillText("What could happen over the next few hours?", padX, y);

  y += 24;
  const timelineEvents = selectTopTimelineEvents(pulse.events, 4);
  const footerReserved = 104;
  const availH = HEIGHT - footerReserved - y;

  if (timelineEvents.length === 0) {
    drawRoundedRect(ctx, padX, y + 20, innerW, 180, 24);
    ctx.fillStyle = "rgba(15, 23, 42, 0.65)";
    ctx.fill();
    ctx.strokeStyle = "rgba(56, 189, 248, 0.22)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = "#e2e8f0";
    ctx.font = "700 26px system-ui, -apple-system, Segoe UI, sans-serif";
    ctx.fillText(
      "No significant weather changes expected in the next few hours.",
      padX + 40,
      y + 102
    );

    ctx.fillStyle = "#94a3b8";
    ctx.font = "500 20px system-ui, -apple-system, Segoe UI, sans-serif";
    ctx.fillText(
      "Live ECMWF short-range guidance indicates steady conditions for this location.",
      padX + 40,
      y + 142
    );
  } else {
    const count = timelineEvents.length;
    const rowGap = 18;
    const rowH = Math.min(138, Math.floor((availH - rowGap * (count - 1)) / count));
    const lineX = padX + 26;

    // Vertical connecting line
    if (count > 1) {
      const startY = y + rowH / 2;
      const endY = y + (count - 1) * (rowH + rowGap) + rowH / 2;
      const lineGrad = ctx.createLinearGradient(lineX, startY, lineX, endY);
      lineGrad.addColorStop(0, "rgba(34, 211, 238, 0.8)");
      lineGrad.addColorStop(1, "rgba(56, 189, 248, 0.25)");
      ctx.strokeStyle = lineGrad;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(lineX, startY);
      ctx.lineTo(lineX, endY);
      ctx.stroke();
    }

    timelineEvents.forEach((ev, idx) => {
      const ey = y + idx * (rowH + rowGap);
      const vis = getKindVisuals(ev.kind);
      const src = getSourceBadge(ev.sourceType);

      // Marker circle on timeline rail
      const markerY = ey + rowH / 2;
      ctx.beginPath();
      ctx.arc(lineX, markerY, 13, 0, Math.PI * 2);
      ctx.fillStyle = "#040914";
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = vis.accent;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(lineX, markerY, 5, 0, Math.PI * 2);
      ctx.fillStyle = vis.accent;
      ctx.fill();

      // Event card
      const cardX = padX + 58;
      const cardW = innerW - 58;
      drawRoundedRect(ctx, cardX, ey, cardW, rowH, 20);
      ctx.fillStyle = vis.bg;
      ctx.fill();
      ctx.strokeStyle = `${vis.accent}55`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Top row inside event card: Time + Emoji + Headline + Badges
      ctx.fillStyle = vis.accent;
      ctx.font = "800 22px system-ui, -apple-system, Segoe UI, sans-serif";
      ctx.fillText(ev.localTimeLabel, cardX + 22, ey + 40);

      ctx.font = "24px system-ui, Apple Color Emoji, Segoe UI Emoji, sans-serif";
      ctx.fillText(vis.emoji, cardX + 150, ey + 42);

      ctx.fillStyle = "#ffffff";
      ctx.font = "800 22px system-ui, -apple-system, Segoe UI, sans-serif";
      ctx.fillText(ev.headline, cardX + 190, ey + 40);

      // Source & Confidence pills on top-right of event card
      const confLabel = `${ev.confidence} CONF`;
      ctx.font = "700 14px system-ui, -apple-system, Segoe UI, sans-serif";
      const confW = ctx.measureText(confLabel).width + 20;
      const srcW = ctx.measureText(src.label).width + 20;

      // Confidence pill
      const confX = cardX + cardW - confW - 18;
      drawRoundedRect(ctx, confX, ey + 17, confW, 28, 14);
      ctx.fillStyle = "rgba(15, 23, 42, 0.78)";
      ctx.fill();
      ctx.fillStyle = getConfidenceColor(ev.confidence);
      ctx.fillText(confLabel, confX + 10, ey + 36);

      // Source pill
      const srcX = confX - srcW - 10;
      drawRoundedRect(ctx, srcX, ey + 17, srcW, 28, 14);
      ctx.fillStyle = src.bg;
      ctx.fill();
      ctx.fillStyle = src.color;
      ctx.fillText(src.label, srcX + 10, ey + 36);

      // Explanation text
      ctx.fillStyle = "#cbd5e1";
      ctx.font = "500 19px system-ui, -apple-system, Segoe UI, sans-serif";
      const lines = wrapText(ctx, ev.explanation, cardW - 44, 2);
      lines.forEach((line, lIdx) => {
        ctx.fillText(line, cardX + 22, ey + 78 + lIdx * 25);
      });
    });
  }

  // =========================================================================
  // FOOTER (Data Timestamp & VAANAM AI Branding)
  // =========================================================================
  const footerY = HEIGHT - 74;
  ctx.strokeStyle = "rgba(148, 163, 184, 0.16)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(padX, footerY - 24);
  ctx.lineTo(WIDTH - padX, footerY - 24);
  ctx.stroke();

  ctx.fillStyle = "#94a3b8";
  ctx.font = "500 17px system-ui, -apple-system, Segoe UI, sans-serif";
  const provText = pulse.radarObservationTimeLabel
    ? `Data: ECMWF IFS/ENS + RainViewer Radar (${pulse.radarObservationTimeLabel}) • ${pulse.dataFreshnessLabel}`
    : `Data: ECMWF IFS 0.25° & ENS 51-Member Model • ${pulse.dataFreshnessLabel}`;
  ctx.fillText(provText, padX, footerY + 6);

  ctx.fillStyle = "#22d3ee";
  ctx.font = "800 22px system-ui, -apple-system, Segoe UI, sans-serif";
  const brand = "VAANAM AI";
  const brandW = ctx.measureText(brand).width;
  ctx.fillText(brand, WIDTH - padX - brandW, footerY + 8);
}
