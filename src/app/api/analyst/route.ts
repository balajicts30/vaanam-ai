import { NextRequest, NextResponse } from "next/server";
import { serverCache } from "@/lib/cache";
import { generateAiWeatherReport } from "@/lib/models/ai-analyst";
import { ContentLanguage, WeatherIntelligencePayload } from "@/types/weather";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const payload = body?.payload as WeatherIntelligencePayload | undefined;
    const language = (body?.language || "en") as ContentLanguage;

    if (!payload || !payload.location || !payload.current) {
      return NextResponse.json(
        { error: "Valid WeatherIntelligencePayload is required." },
        { status: 400 }
      );
    }

    const cacheKey = `analyst:${payload.location.latitude.toFixed(2)},${payload.location.longitude.toFixed(
      2
    )}:${language}:${payload.retrievedAt.slice(0, 13)}`;
    const cached = serverCache.get(cacheKey);
    if (cached) return NextResponse.json(cached);

    const report = await generateAiWeatherReport(payload, language);
    serverCache.set(cacheKey, report, 900);
    return NextResponse.json(report);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to generate AI weather report." },
      { status: 500 }
    );
  }
}
