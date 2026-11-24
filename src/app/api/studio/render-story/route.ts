import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { createCanvas } from "@napi-rs/canvas";
import ffmpegPath from "ffmpeg-static";
import {
  Canvas2DLike,
  renderStoryFrame,
  StoryRenderPayload,
} from "@/lib/studio/story-renderer";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Renders a real 10-second animated 1080×1920 H.264 MP4 Instagram Story video
 * by piping 200 rendered RGBA frames (20 fps × 10s) directly into FFmpeg (libx264, yuv420p).
 */
export async function POST(req: NextRequest) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "vaanam-story-"));
  const outputPath = path.join(tempDir, "vaanam-story.mp4");

  try {
    const data = (await req.json()) as StoryRenderPayload;
    if (!data || !data.city) {
      return NextResponse.json({ error: "Story payload is required." }, { status: 400 });
    }

    if (!ffmpegPath) {
      return NextResponse.json(
        { error: "FFmpeg binary not available in server environment." },
        { status: 500 }
      );
    }

    const width = 1080;
    const height = 1920;
    const fps = 20;
    const durationSec = 10;
    const totalFrames = fps * durationSec; // 200 frames = exact 10.0 seconds

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d") as unknown as Canvas2DLike;

    const ffmpeg = spawn(ffmpegPath, [
      "-y",
      "-f",
      "rawvideo",
      "-pix_fmt",
      "rgba",
      "-s",
      `${width}x${height}`,
      "-r",
      String(fps),
      "-i",
      "pipe:0",
      "-c:v",
      "libx264",
      "-preset",
      "ultrafast",
      "-crf",
      "23",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      "-t",
      String(durationSec),
      outputPath,
    ]);

    let stderrLog = "";
    ffmpeg.stderr.on("data", (chunk) => {
      stderrLog += chunk.toString();
    });

    const ffmpegDone = new Promise<void>((resolve, reject) => {
      ffmpeg.on("error", reject);
      ffmpeg.on("close", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`FFmpeg exited with code ${code}: ${stderrLog.slice(-400)}`));
      });
    });

    for (let frame = 0; frame < totalFrames; frame++) {
      const tSec = frame / fps;
      renderStoryFrame(ctx, width, height, tSec, data);
      const rawRgba = canvas.data();
      const canContinue = ffmpeg.stdin.write(Buffer.from(rawRgba));
      if (!canContinue) {
        await new Promise<void>((res) => ffmpeg.stdin.once("drain", res));
      }
    }

    ffmpeg.stdin.end();
    await ffmpegDone;

    const mp4Buffer = await fs.readFile(outputPath);
    const safeCity = data.city.toLowerCase().replace(/[^a-z0-9]+/g, "-");

    return new NextResponse(mp4Buffer, {
      status: 200,
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": `attachment; filename="vaanam-${safeCity}-story-10s.mp4"`,
        "Content-Length": String(mp4Buffer.length),
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Failed to render 10-second animated MP4 Story.",
      },
      { status: 500 }
    );
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}
