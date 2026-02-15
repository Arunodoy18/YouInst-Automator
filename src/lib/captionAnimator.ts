/**
 * Caption Animator — ASS subtitle + ffmpeg compositing engine
 *
 * Renders animated, keyword-highlighted captions onto a processed
 * background video and merges voice-over + optional background music
 * into the final output — all in a single ffmpeg pass.
 *
 * Features:
 *   - Large bold centered text in the vertical safe zone
 *   - Fade-in / fade-out animation per caption (200 ms)
 *   - Semi-transparent text shadow + outline for readability
 *   - Accent-color highlighting for "power words"
 *   - Audio mix: voice at full volume, bg music at 12 %
 *
 * Uses an ASS subtitle file for rich text styling (avoids the
 * nightmare of chaining 50+ drawtext filters with shell escaping).
 * A filter_complex_script file avoids all shell-quoting issues.
 */

import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import type { TimedCaption } from "./videoRenderer";

const execAsync = promisify(exec);

/* ── Types ─────────────────────────────────────────────────────────── */

export interface CaptionStyleConfig {
  /** Hex accent color for power-word highlighting (e.g. "#FF6B35") */
  accentColor: string;
  /** Font size in pixels (scaled to 1080×1920 canvas) */
  fontSize: number;
  /** Vertical center of caption zone, 0–1 ratio from top */
  yCenter: number;
  /** Fade duration in milliseconds */
  fadeMs: number;
}

/* ── Defaults ──────────────────────────────────────────────────────── */

const DEFAULT_STYLE: CaptionStyleConfig = {
  accentColor: "#00D4FF",
  fontSize: 72,
  yCenter: 0.44, // ~44 % from top = centre of the safe zone
  fadeMs: 200,
};

/** Words that get highlighted with the accent color */
const POWER_WORDS = new Set([
  "never",
  "always",
  "secret",
  "insane",
  "shocking",
  "amazing",
  "incredible",
  "powerful",
  "dangerous",
  "critical",
  "massive",
  "billion",
  "million",
  "money",
  "free",
  "hack",
  "truth",
  "lie",
  "hidden",
  "banned",
  "exposed",
  "urgent",
  "breaking",
  "impossible",
  "guaranteed",
  "proven",
  "instantly",
  "deadly",
  "unbelievable",
  "revolutionary",
]);

/* ── Public API ────────────────────────────────────────────────────── */

/**
 * Render captions onto a processed background video and merge audio.
 *
 * @param processedVideoPath  Motion-composed background (no audio)
 * @param voicePath           Voice-over audio file (MP3)
 * @param captions            Timed captions from Whisper
 * @param outputDir           Output directory
 * @param options             Optional bg music path and style overrides
 * @returns Path to the final composited video (video.mp4)
 */
export async function renderWithCaptions(
  processedVideoPath: string,
  voicePath: string,
  captions: TimedCaption[],
  outputDir: string,
  options?: {
    bgMusicPath?: string | null;
    style?: Partial<CaptionStyleConfig>;
  }
): Promise<string> {
  const style: CaptionStyleConfig = { ...DEFAULT_STYLE, ...options?.style };
  const outFile = path.resolve(outputDir, "video.mp4");
  const hasBgMusic =
    options?.bgMusicPath && fs.existsSync(options.bgMusicPath);

  // Resolve ffmpeg binary
  let ffmpegPath = "ffmpeg";
  try {
    ffmpegPath = require("ffmpeg-static");
  } catch {
    /* fall back to system ffmpeg */
  }

  // ── 1. Generate ASS subtitle file ──────────────────────────────
  const assPath = path.resolve(outputDir, "captions.ass");
  const assContent = generateASS(captions, style);
  fs.writeFileSync(assPath, assContent, "utf-8");

  // ── 2. Build filter_complex and write to script file ───────────
  const filterPath = path.resolve(outputDir, "caption_filter.txt");
  const assPathEscaped = assPath.replace(/\\/g, "/").replace(/:/g, "\\:");

  let filterComplex: string;
  if (hasBgMusic) {
    // Video: overlay subtitles → [vout]
    // Audio: bg music looped at 12 % + voice → amix → [aout]
    filterComplex = [
      `[0:v]ass='${assPathEscaped}'[vout];`,
      `[2:a]volume=0.12,aloop=loop=-1:size=2e+09[bg];`,
      `[1:a][bg]amix=inputs=2:duration=shortest:dropout_transition=2[aout]`,
    ].join("\n");
  } else {
    // Video only — audio is mapped directly from voice input
    filterComplex = `[0:v]ass='${assPathEscaped}'[vout]`;
  }

  fs.writeFileSync(filterPath, filterComplex, "utf-8");

  // ── 3. Build ffmpeg command ────────────────────────────────────
  const inputs = [
    `-i "${processedVideoPath}"`, // 0: processed background video
    `-i "${voicePath}"`, // 1: voice-over
  ];
  if (hasBgMusic) {
    inputs.push(`-i "${options!.bgMusicPath}"`); // 2: background music
  }

  const mappings = hasBgMusic
    ? `-map "[vout]" -map "[aout]"`
    : `-map "[vout]" -map 1:a`;

  const cmd = [
    `"${ffmpegPath}"`,
    `-y`,
    ...inputs,
    `-filter_complex_script "${filterPath}"`,
    mappings,
    `-c:v libx264 -preset medium -crf 28 -maxrate 8M -bufsize 16M`,
    `-c:a aac -b:a 128k`,
    `-r 30`,
    `-shortest`,
    `-movflags +faststart`,
    `-pix_fmt yuv420p`,
    `"${outFile}"`,
  ].join(" ");

  console.log("  → Animating captions + merging audio…");

  try {
    await execAsync(cmd, { maxBuffer: 20 * 1024 * 1024, timeout: 300_000 });
  } catch (err: any) {
    console.error(`  → Caption render failed: ${err.message}`);

    // Fallback: merge audio without captions
    console.log("  → Falling back to audio-only merge (no captions)…");
    await mergeAudioOnly(
      ffmpegPath,
      processedVideoPath,
      voicePath,
      options?.bgMusicPath ?? null,
      outFile
    );
  }

  // ── 4. Clean up temp files ─────────────────────────────────────
  for (const tmp of [assPath, filterPath]) {
    try {
      fs.unlinkSync(tmp);
    } catch {
      /* ignore */
    }
  }

  console.log(`  → Final video saved: ${outFile}`);
  return outFile;
}

/* ── ASS Subtitle Generator ───────────────────────────────────────── */

/**
 * Generate a complete ASS subtitle file with styled, highlighted captions.
 */
function generateASS(
  captions: TimedCaption[],
  style: CaptionStyleConfig
): string {
  const font = resolveFontName();
  const accentASS = hexToASS(style.accentColor);
  const whiteASS = "&H00FFFFFF";

  // MarginV positions the text center; Alignment=5 = middle-center
  // For 1920px height, safe zone center at ~44 % from top = y ≈ 845
  // ASS MarginV with Alignment=5 shifts from absolute center
  // We use \pos override in each dialogue for precise placement
  const posX = 540; // horizontal center of 1080
  const posY = Math.round(1920 * style.yCenter);

  const header = [
    `[Script Info]`,
    `Title: Auto Captions`,
    `ScriptType: v4.00+`,
    `PlayResX: 1080`,
    `PlayResY: 1920`,
    `WrapStyle: 0`,
    `ScaledBorderAndShadow: yes`,
    ``,
    `[V4+ Styles]`,
    `Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding`,
    `Style: Default,${font},${style.fontSize},${whiteASS},&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,4,2,5,40,40,0,1`,
    ``,
    `[Events]`,
    `Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text`,
  ].join("\n");

  const dialogues = captions.map((cap) => {
    const start = secondsToASS(cap.start);
    const end = secondsToASS(cap.end);

    // Highlight power words with accent color
    const styledText = highlightPowerWords(cap.text, accentASS, whiteASS);

    // Override tags: position + fade
    const overrides = `{\\an5\\pos(${posX},${posY})\\fad(${style.fadeMs},${style.fadeMs})}`;

    return `Dialogue: 0,${start},${end},Default,,0,0,0,,${overrides}${styledText}`;
  });

  return header + "\n" + dialogues.join("\n") + "\n";
}

/* ── Helpers ───────────────────────────────────────────────────────── */

/**
 * Convert seconds to ASS timestamp format: H:MM:SS.cc (centiseconds)
 */
function secondsToASS(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const cs = Math.round((sec % 1) * 100);
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

/**
 * Convert hex color (#RRGGBB) to ASS color (&H00BBGGRR).
 */
function hexToASS(hex: string): string {
  const clean = hex.replace("#", "");
  const r = clean.slice(0, 2).toUpperCase();
  const g = clean.slice(2, 4).toUpperCase();
  const b = clean.slice(4, 6).toUpperCase();
  return `&H00${b}${g}${r}`;
}

/**
 * Highlight power words with accent color using ASS override tags.
 */
function highlightPowerWords(
  text: string,
  accentASS: string,
  defaultASS: string
): string {
  return text
    .split(" ")
    .map((word) => {
      const clean = word.toLowerCase().replace(/[^a-z]/g, "");
      if (POWER_WORDS.has(clean)) {
        return `{\\c${accentASS}}${word}{\\c${defaultASS}}`;
      }
      return word;
    })
    .join(" ");
}

/**
 * Resolve a font name available on the current platform.
 * Returns the font family name (not file path) for ASS Fontname field.
 */
function resolveFontName(): string {
  const candidates: Array<{ name: string; path: string }> = [
    { name: "Arial", path: "C:/Windows/Fonts/arialbd.ttf" },
    { name: "Arial", path: "C:/Windows/Fonts/arial.ttf" },
    {
      name: "DejaVu Sans",
      path: "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    },
    {
      name: "Liberation Sans",
      path: "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    },
    { name: "Arial", path: "/Library/Fonts/Arial Bold.ttf" },
  ];

  for (const c of candidates) {
    if (fs.existsSync(c.path)) {
      return c.name;
    }
  }

  // Last resort — hope fontconfig can resolve it
  return "Arial";
}

/**
 * Fallback: merge audio into video without captions
 * (mirrors the existing videoRenderer.ts logic).
 */
async function mergeAudioOnly(
  ffmpegPath: string,
  videoPath: string,
  voicePath: string,
  bgMusicPath: string | null,
  outFile: string
): Promise<void> {
  if (bgMusicPath && fs.existsSync(bgMusicPath)) {
    await execAsync(
      `"${ffmpegPath}" -y -i "${videoPath}" -i "${voicePath}" -i "${bgMusicPath}" ` +
        `-filter_complex "[2:a]volume=0.12,aloop=loop=-1:size=2e+09[bg];[1:a][bg]amix=inputs=2:duration=shortest:dropout_transition=2[aout]" ` +
        `-map 0:v:0 -map "[aout]" -c:v copy -c:a aac -shortest "${outFile}"`,
      { maxBuffer: 10 * 1024 * 1024 }
    );
  } else {
    await execAsync(
      `"${ffmpegPath}" -y -i "${videoPath}" -i "${voicePath}" -c:v copy -c:a aac -map 0:v:0 -map 1:a:0 -shortest "${outFile}"`,
      { maxBuffer: 10 * 1024 * 1024 }
    );
  }
}
