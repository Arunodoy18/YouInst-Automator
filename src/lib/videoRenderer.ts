import path from "path";
import fs from "fs";
import { exec } from "child_process";
import { promisify } from "util";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";

const execAsync = promisify(exec);

export interface TimedCaption {
  text: string;
  start: number;
  end: number;
}

/**
 * Render a vertical Shorts video (1080×1920) with Remotion,
 * then merge voice-over + optional background music into the final MP4.
 */
export async function renderVideo(
  scenes: string[],
  voicePath: string,
  outputDir: string,
  options?: {
    captions?: TimedCaption[];
    bgMusicPath?: string | null;
  }
): Promise<string> {
  const silentFile = path.resolve(outputDir, "video_silent.mp4");
  const outFile = path.resolve(outputDir, "video.mp4");

  // ── Get audio duration so the video matches the voice-over ─────────
  const audioDurationSec = await getAudioDuration(voicePath);
  const fps = 30;
  const totalFrames = Math.ceil(audioDurationSec * fps);

  console.log(
    `  → Audio duration: ${audioDurationSec.toFixed(1)}s → ${totalFrames} frames`
  );

  // ── Determine input props ──────────────────────────────────────────
  const inputProps: Record<string, unknown> = options?.captions
    ? { captions: options.captions }
    : { scenes };

  // ── Bundle the Remotion project ────────────────────────────────────
  console.log("  → Bundling Remotion composition…");
  const entryPoint = path.resolve(__dirname, "../remotion/Root.tsx");
  const bundleLocation = await bundle({ entryPoint, webpackOverride: (c) => c });

  // ── Select the composition and override duration + props ───────────
  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: "ShortsVideo",
    inputProps,
  });

  composition.durationInFrames = totalFrames;
  composition.fps = fps;
  composition.width = 1080;
  composition.height = 1920;

  // ── Render silent video ────────────────────────────────────────────
  console.log("  → Rendering video frames…");
  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: "h264",
    outputLocation: silentFile,
    inputProps,
  });

  // ── Merge audio ────────────────────────────────────────────────────
  const ffmpegPath = require("ffmpeg-static") as string;

  if (options?.bgMusicPath && fs.existsSync(options.bgMusicPath)) {
    // Mix voice + background music (bg at 12% volume) + video
    console.log("  → Merging voice-over + background music into video…");
    await execAsync(
      `"${ffmpegPath}" -y -i "${silentFile}" -i "${voicePath}" -i "${options.bgMusicPath}" ` +
        `-filter_complex "[2:a]volume=0.12,aloop=loop=-1:size=2e+09[bg];[1:a][bg]amix=inputs=2:duration=shortest:dropout_transition=2[aout]" ` +
        `-map 0:v:0 -map "[aout]" -c:v copy -c:a aac -shortest "${outFile}"`,
      { maxBuffer: 10 * 1024 * 1024 }
    );
  } else {
    // Voice only (no bg music)
    console.log("  → Merging voice-over audio into video…");
    await execAsync(
      `"${ffmpegPath}" -y -i "${silentFile}" -i "${voicePath}" -c:v copy -c:a aac -map 0:v:0 -map 1:a:0 -shortest "${outFile}"`,
      { maxBuffer: 10 * 1024 * 1024 }
    );
  }

  // Clean up silent intermediate file
  if (fs.existsSync(silentFile)) {
    fs.unlinkSync(silentFile);
  }

  console.log(`  → Video saved (with audio): ${outFile}`);
  return outFile;
}

/* ──────────────────────────────────────────────────────────────────────
   Helper: get MP3 duration (seconds) using fluent-ffmpeg + ffmpeg-static
   ────────────────────────────────────────────────────────────────────── */
export function getAudioDuration(filePath: string): Promise<number> {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const ffmpegPath = require("ffmpeg-static") as string;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const ffprobePath = require("@ffprobe-installer/ffprobe").path as string;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const ffmpeg = require("fluent-ffmpeg") as typeof import("fluent-ffmpeg");

  (ffmpeg as any).setFfmpegPath(ffmpegPath);
  (ffmpeg as any).setFfprobePath(ffprobePath);

  return new Promise((resolve, reject) => {
    (ffmpeg as any).ffprobe(filePath, (err: Error | null, metadata: any) => {
      if (err) return reject(err);
      const duration: number = metadata?.format?.duration ?? 30;
      resolve(duration);
    });
  });
}
