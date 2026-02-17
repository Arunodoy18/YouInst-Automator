/**
 * Motion Composer — ffmpeg-powered cinematic video effects
 *
 * Takes a raw background video and applies a layered effects chain:
 *   1. Loop source to match target voice-over duration
 *   2. Scale + crop to 1080×1920 (vertical Shorts, cover mode)
 *   3. Subtle Ken Burns pan (oscillating crop position)
 *   4. Film vignette (cinematic depth)
 *   5. Light grain / noise overlay (film texture)
 *   6. Pattern interrupts (periodic brightness pulse)
 *
 * Uses a filter-script file to avoid shell escaping issues.
 * Falls back to a simple scale+crop if the full chain fails.
 *
 * Output: processed 1080×1920 H264 video without audio.
 */

import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

/* ── Types ─────────────────────────────────────────────────────────── */

export interface MotionConfig {
  /** Controls pan speed, grain density, interrupt frequency */
  intensity: "low" | "medium" | "high";
  /** Seconds between brightness-pulse pattern interrupts */
  patternInterruptSec: number;
  /** Add subtle film grain */
  enableGrain: boolean;
  /** Add edge vignette */
  enableVignette: boolean;
}

/* ── Defaults & Lookup Tables ──────────────────────────────────────── */

const DEFAULT_CONFIG: MotionConfig = {
  intensity: "medium",
  patternInterruptSec: 7,
  enableGrain: true,
  enableVignette: true,
};

/** Pan oscillation amplitude in pixels (added to overscan) */
const PAN_AMPLITUDE: Record<MotionConfig["intensity"], number> = {
  low: 20,
  medium: 50,
  high: 80,
};

/** Pan oscillation cycle duration in seconds */
const PAN_PERIOD: Record<MotionConfig["intensity"], number> = {
  low: 20,
  medium: 12,
  high: 7,
};

/** Grain strength for the ffmpeg noise filter (alls param) */
const GRAIN_STRENGTH: Record<MotionConfig["intensity"], number> = {
  low: 4,
  medium: 8,
  high: 14,
};

/* ── Public API ────────────────────────────────────────────────────── */

/**
 * Process a background video with cinematic motion effects.
 *
 * @param backgroundPath   Path to the raw background video
 * @param targetDurationSec  Desired output duration (matches voice-over)
 * @param outputDir        Directory for the output file
 * @param config           Optional motion configuration overrides
 * @returns Path to the processed video file (bg_processed.mp4)
 */
export async function composeMotion(
  backgroundPath: string,
  targetDurationSec: number,
  outputDir: string,
  config?: Partial<MotionConfig>
): Promise<string> {
  const cfg: MotionConfig = { ...DEFAULT_CONFIG, ...config };
  const outFile = path.resolve(outputDir, "bg_processed.mp4");

  // Resolve ffmpeg binary
  let ffmpegPath = "ffmpeg";
  try {
    ffmpegPath = require("ffmpeg-static");
  } catch {
    /* fall back to system ffmpeg */
  }

  // Build the filter chain and write to a temp script file
  const filterChain = buildFilterChain(cfg);
  const filterScript = path.resolve(outputDir, "motion_filter.txt");
  fs.writeFileSync(filterScript, filterChain, "utf-8");

  // ffmpeg command:
  //   -stream_loop -1  : loop input video indefinitely
  //   -t duration      : cut to target length
  //   -an              : discard audio from background
  const cmd = [
    `"${ffmpegPath}"`,
    `-y`,
    `-stream_loop -1`,
    `-t ${targetDurationSec.toFixed(2)}`,
    `-i "${backgroundPath}"`,
    `-filter_script:v "${filterScript}"`,
    `-c:v libx264 -preset veryfast -crf 30`,
    `-r 30`,
    `-an`,
    `-pix_fmt yuv420p`,
    `"${outFile}"`,
  ].join(" ");

  console.log("  → Composing motion effects on background…");

  try {
    await execAsync(cmd, { maxBuffer: 20 * 1024 * 1024, timeout: 180_000 });
  } catch (err: any) {
    console.error(`  → Full motion chain failed: ${err.message}`);
    console.log("  → Falling back to simple scale + crop…");

    // Fallback: basic loop + fit to 1080×1920 without fancy effects
    const fallbackFilter =
      "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920";
    fs.writeFileSync(filterScript, fallbackFilter, "utf-8");

    const fallbackCmd = [
      `"${ffmpegPath}"`,
      `-y`,
      `-stream_loop -1`,
      `-t ${targetDurationSec.toFixed(2)}`,
      `-i "${backgroundPath}"`,
      `-filter_script:v "${filterScript}"`,
      `-c:v libx264 -preset veryfast -crf 30`,
      `-r 30 -an -pix_fmt yuv420p`,
      `"${outFile}"`,
    ].join(" ");

    await execAsync(fallbackCmd, {
      maxBuffer: 20 * 1024 * 1024,
      timeout: 180_000,
    });
  }

  // Clean up filter script
  try {
    fs.unlinkSync(filterScript);
  } catch {
    /* ignore */
  }

  console.log(`  → Motion-processed background saved: ${outFile}`);
  return outFile;
}

/* ── Filter Chain Builder ──────────────────────────────────────────── */

/**
 * Build the ffmpeg video filter chain written to a filter-script file.
 *
 * Pipeline:
 *   scale (overscan) → crop (center) → crop (oscillating pan) →
 *   vignette → noise (grain) → eq (brightness pattern interrupt)
 */
function buildFilterChain(cfg: MotionConfig): string {
  const amp = PAN_AMPLITUDE[cfg.intensity];
  const period = PAN_PERIOD[cfg.intensity];

  // Overscan dimensions — slightly larger than 1080×1920 to allow pan
  const overscanW = 1080 + amp * 2;
  const overscanH = 1920 + amp * 2;

  const filters: string[] = [];

  // 1. Scale to overscan size (cover mode: fill shortest dimension)
  filters.push(
    `scale=${overscanW}:${overscanH}:force_original_aspect_ratio=increase`
  );
  // Center-crop to overscan dimensions (handles non-matching aspect ratios)
  filters.push(`crop=${overscanW}:${overscanH}`);

  // 2. Ken Burns pan — sinusoidal oscillation of crop position
  //    x oscillates with sin(), y with cos() at a slightly different period
  //    to create a natural 2D drift
  const panX = `${amp}+${amp}*sin(2*PI*t/${period})`;
  const panY = `${amp}+${amp}*cos(2*PI*t/${(period * 1.3).toFixed(1)})`;
  filters.push(`crop=1080:1920:${panX}:${panY}`);

  // 3. Vignette — cinematic edge darkening
  if (cfg.enableVignette) {
    filters.push("vignette=PI/5");
  }

  // 4. Film grain — temporal noise overlay
  if (cfg.enableGrain) {
    const strength = GRAIN_STRENGTH[cfg.intensity];
    filters.push(`noise=alls=${strength}:allf=t`);
  }

  // 5. Pattern interrupt — brief brightness pulse every N seconds
  //    Uses the eq filter with a conditional expression:
  //    - mod(t, interval) < 0.3  → we're in a "flash" window
  //    - sin(PI * phase / 0.3)   → smooth 0→1→0 pulse shape
  //    - 0.06 scale              → very subtle (not jarring)
  const pi = cfg.patternInterruptSec;
  filters.push(
    `eq=brightness='0.06*lt(mod(t,${pi}),0.3)*sin(PI*mod(t,${pi})/0.3)'`
  );

  return filters.join(",");
}
