/**
 * Procedural Background Generator — Pure ffmpeg seamless vertical loops
 *
 * Generates a 9:16 (1080×1920) loopable background video using only
 * ffmpeg filters — no external assets, no copyrighted content.
 *
 * Visual style:
 *   - Endless forward motion along a stylized path/tunnel
 *   - Floating glowing particles with soft depth-of-field
 *   - Smooth camera movement (sinusoidal drifts)
 *   - Neutral, dopamine-inducing motion
 *   - Low visual noise (captions stay readable)
 *   - Seamless loop (6-8 second cycle)
 *
 * Uses ffmpeg's lavfi source filters:
 *   - color, gradients for base layers
 *   - geq for animated procedural tunnel/path
 *   - overlay, blend for particle layers
 *   - hue shift for color cycling
 *   - format + vignette for depth-of-field feel
 */

import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

/* ── Types ─────────────────────────────────────────────────────────── */

export type LoopStyle =
  | "tunnel"       // Endless forward tunnel with glowing walls
  | "particles"    // Floating particles on dark gradient
  | "waveform"     // Smooth sine-wave flowing path
  | "grid_runner"; // Infinite grid with depth perspective

export interface LoopConfig {
  /** Visual style preset */
  style: LoopStyle;
  /** Loop duration in seconds (6-8 recommended) */
  loopDurationSec: number;
  /** Base hue for color theme (0-360) */
  baseHue: number;
  /** Brightness reduction (0-1, lower = darker/more readable text) */
  dimFactor: number;
}

/* ── Defaults ──────────────────────────────────────────────────────── */

const DEFAULT_CONFIG: LoopConfig = {
  style: "tunnel",
  loopDurationSec: 7,
  baseHue: 200, // Cyan-blue
  dimFactor: 0.35,
};

/** Map background mode to procedural loop style + color */
const MODE_TO_LOOP: Record<string, { style: LoopStyle; baseHue: number }> = {
  endless_runner: { style: "grid_runner", baseHue: 25 },   // Warm orange
  temple_run:     { style: "tunnel", baseHue: 40 },        // Ancient gold
  futuristic:     { style: "tunnel", baseHue: 200 },       // Cyan
  finance:        { style: "waveform", baseHue: 140 },     // Green
  productivity:   { style: "particles", baseHue: 270 },    // Purple
  high_energy:    { style: "tunnel", baseHue: 340 },       // Hot pink
};

/* ── Public API ────────────────────────────────────────────────────── */

/**
 * Generate a seamless loopable vertical video background.
 *
 * @param outputDir   Directory to write the loop file
 * @param mode        Background mode from visual strategy
 * @param config      Optional overrides
 * @returns Path to the generated loop video (bg_loop.mp4)
 */
export async function generateProceduralBackground(
  outputDir: string,
  mode?: string,
  config?: Partial<LoopConfig>
): Promise<string> {
  const modePreset = MODE_TO_LOOP[mode ?? "futuristic"] ?? MODE_TO_LOOP.futuristic;
  const cfg: LoopConfig = {
    ...DEFAULT_CONFIG,
    style: modePreset.style,
    baseHue: modePreset.baseHue,
    ...config,
  };

  const outFile = path.resolve(outputDir, "bg_loop.mp4");

  // Resolve ffmpeg binary
  let ffmpegPath = "ffmpeg";
  try {
    ffmpegPath = require("ffmpeg-static");
  } catch { /* system ffmpeg */ }

  const filterChain = buildProceduralFilter(cfg);
  const filterScript = path.resolve(outputDir, "procedural_filter.txt");
  fs.writeFileSync(filterScript, filterChain, "utf-8");

  const fps = 30;
  const totalFrames = Math.ceil(cfg.loopDurationSec * fps);

  const cmd = [
    `"${ffmpegPath}"`,
    `-y`,
    `-f lavfi`,
    `-i "color=c=black:s=1080x1920:r=${fps}:d=${cfg.loopDurationSec}"`,
    `-f lavfi`,
    `-i "color=c=black:s=1080x1920:r=${fps}:d=${cfg.loopDurationSec}"`,
    `-filter_complex_script "${filterScript}"`,
    `-map "[final]"`,
    `-c:v libx264 -preset slow -crf 18`,  // High quality HD
    `-t ${cfg.loopDurationSec}`,
    `-r ${fps}`,
    `-an`,
    `-pix_fmt yuv420p`,
    `"${outFile}"`,
  ].join(" ");

  console.log(`  → Generating procedural ${cfg.style} background (${cfg.loopDurationSec}s loop, hue=${cfg.baseHue})…`);

  try {
    await execAsync(cmd, { maxBuffer: 20 * 1024 * 1024, timeout: 120_000 });
  } catch (err: any) {
    console.error(`  → Procedural ${cfg.style} failed: ${err.message}`);
    console.log(`  → Falling back to simple gradient loop…`);
    await generateFallbackGradient(ffmpegPath, outFile, cfg);
  }

  // Clean up
  try { fs.unlinkSync(filterScript); } catch { /* ignore */ }

  if (!fs.existsSync(outFile)) {
    throw new Error("Procedural background generation failed — no output file");
  }

  console.log(`  → Procedural loop saved: ${outFile}`);
  return outFile;
}

/* ── Filter Builders ───────────────────────────────────────────────── */

function buildProceduralFilter(cfg: LoopConfig): string {
  switch (cfg.style) {
    case "tunnel":
      return buildTunnelFilter(cfg);
    case "particles":
      return buildParticleFilter(cfg);
    case "waveform":
      return buildWaveformFilter(cfg);
    case "grid_runner":
      return buildGridRunnerFilter(cfg);
    default:
      return buildTunnelFilter(cfg);
  }
}

/**
 * Tunnel: Radial gradient with sinusoidal pulsing, zoom animation,
 * and rotating hue — creates forward-motion illusion.
 */
function buildTunnelFilter(cfg: LoopConfig): string {
  const dim = cfg.dimFactor;
  const period = cfg.loopDurationSec;

  // Layer 0: animated radial gradient (tunnel center glow)
  // Layer 1: concentric ring pattern via geq
  // Composite: blend + hue rotate + vignette + dim
  return [
    // Base layer: dark radial gradient with pulsing center
    `[0:v]geq=` +
      `r='clip(${Math.round(40 * dim)}+${Math.round(100 * dim)}*exp(-((X-540)*(X-540)+(Y-960)*(Y-960))/(200000+80000*sin(2*PI*N/(30*${period})))),0,255)':` +
      `g='clip(${Math.round(60 * dim)}+${Math.round(130 * dim)}*exp(-((X-540)*(X-540)+(Y-960)*(Y-960))/(180000+70000*sin(2*PI*N/(30*${period})))),0,255)':` +
      `b='clip(${Math.round(80 * dim)}+${Math.round(180 * dim)}*exp(-((X-540)*(X-540)+(Y-960)*(Y-960))/(160000+60000*sin(2*PI*N/(30*${period})))),0,255)'` +
      `[base];`,

    // Ring pattern layer: concentric expanding circles
    `[1:v]geq=` +
      `r='clip(${Math.round(30 * dim)}*(1+sin((hypot(X-540,Y-960)-N*3)/(40+10*sin(2*PI*N/(30*${period}))))),0,255)':` +
      `g='clip(${Math.round(50 * dim)}*(1+sin((hypot(X-540,Y-960)-N*3)/(40+10*sin(2*PI*N/(30*${period}))))),0,255)':` +
      `b='clip(${Math.round(70 * dim)}*(1+sin((hypot(X-540,Y-960)-N*3)/(40+10*sin(2*PI*N/(30*${period}))))),0,255)'` +
      `[rings];`,

    // Blend layers
    `[base][rings]blend=all_mode=screen[blended];`,

    // Hue rotation for color cycling + vignette for depth
    `[blended]hue=h=${cfg.baseHue}+30*sin(2*PI*t/${period}),` +
    `vignette=PI/4,` +
    `format=yuv420p[final]`,
  ].join("\n");
}

/**
 * Particles: Floating luminous dots on a dark gradient,
 * gentle vertical drift for "falling stars" effect.
 */
function buildParticleFilter(cfg: LoopConfig): string {
  const dim = cfg.dimFactor;
  const period = cfg.loopDurationSec;

  return [
    // Dark gradient base
    `[0:v]geq=` +
      `r='clip(${Math.round(15 * dim)}+${Math.round(25 * dim)}*(1920-Y)/1920,0,255)':` +
      `g='clip(${Math.round(10 * dim)}+${Math.round(20 * dim)}*(1920-Y)/1920,0,255)':` +
      `b='clip(${Math.round(30 * dim)}+${Math.round(50 * dim)}*(1920-Y)/1920,0,255)'` +
      `[gradient];`,

    // Particle sparkle layer using noise-like pattern
    `[1:v]geq=` +
      `r='clip(${Math.round(200 * dim)}*(mod(X*7+Y*13+N*5,97)<3),0,255)':` +
      `g='clip(${Math.round(220 * dim)}*(mod(X*7+Y*13+N*5,97)<3),0,255)':` +
      `b='clip(${Math.round(255 * dim)}*(mod(X*7+Y*13+N*5,97)<3),0,255)'` +
      `[sparks];`,

    // Composite
    `[gradient][sparks]blend=all_mode=screen[blended];`,

    `[blended]hue=h=${cfg.baseHue}+20*sin(2*PI*t/${period}),` +
    `vignette=PI/3.5,` +
    `format=yuv420p[final]`,
  ].join("\n");
}

/**
 * Waveform: Horizontal sine waves flowing upward, layered with
 * different frequencies for a smooth organic feel.
 */
function buildWaveformFilter(cfg: LoopConfig): string {
  const dim = cfg.dimFactor;
  const period = cfg.loopDurationSec;

  return [
    // Wave layer: multiple sine waves flowing upward
    `[0:v]geq=` +
      `r='clip(${Math.round(20 * dim)}+${Math.round(80 * dim)}*(sin((X/60.0)+N*0.05)+sin((X/120.0)-N*0.03)+1)/3*(1+sin((Y+N*4)/100.0))/2,0,255)':` +
      `g='clip(${Math.round(40 * dim)}+${Math.round(120 * dim)}*(sin((X/60.0)+N*0.05)+sin((X/120.0)-N*0.03)+1)/3*(1+sin((Y+N*4)/100.0))/2,0,255)':` +
      `b='clip(${Math.round(30 * dim)}+${Math.round(60 * dim)}*(sin((X/60.0)+N*0.05)+sin((X/120.0)-N*0.03)+1)/3*(1+sin((Y+N*4)/100.0))/2,0,255)'` +
      `[waves];`,

    // Subtle ambient glow layer
    `[1:v]geq=` +
      `r='clip(${Math.round(60 * dim)}*exp(-((X-540)*(X-540)+(Y-960-200*sin(2*PI*N/(30*${period})))*(Y-960-200*sin(2*PI*N/(30*${period}))))/(300000)),0,255)':` +
      `g='clip(${Math.round(90 * dim)}*exp(-((X-540)*(X-540)+(Y-960-200*sin(2*PI*N/(30*${period})))*(Y-960-200*sin(2*PI*N/(30*${period}))))/(300000)),0,255)':` +
      `b='clip(${Math.round(40 * dim)}*exp(-((X-540)*(X-540)+(Y-960-200*sin(2*PI*N/(30*${period})))*(Y-960-200*sin(2*PI*N/(30*${period}))))/(300000)),0,255)'` +
      `[glow];`,

    `[waves][glow]blend=all_mode=screen[blended];`,

    `[blended]hue=h=${cfg.baseHue}+25*sin(2*PI*t/${period}),` +
    `vignette=PI/4,` +
    `format=yuv420p[final]`,
  ].join("\n");
}

/**
 * Grid Runner: Perspective grid lines scrolling forward —
 * infinite runner / Tron-style floor.
 */
function buildGridRunnerFilter(cfg: LoopConfig): string {
  const dim = cfg.dimFactor;
  const period = cfg.loopDurationSec;

  return [
    // Perspective grid using mod patterns
    `[0:v]geq=` +
      `r='clip(${Math.round(60 * dim)}*(mod(X,80)<2)+${Math.round(60 * dim)}*(mod(Y+N*6,80)<2),0,255)':` +
      `g='clip(${Math.round(80 * dim)}*(mod(X,80)<2)+${Math.round(80 * dim)}*(mod(Y+N*6,80)<2),0,255)':` +
      `b='clip(${Math.round(40 * dim)}*(mod(X,80)<2)+${Math.round(40 * dim)}*(mod(Y+N*6,80)<2),0,255)'` +
      `[grid];`,

    // Glow orbs floating across
    `[1:v]geq=` +
      `r='clip(${Math.round(100 * dim)}*exp(-((X-540-200*sin(2*PI*N/(30*${period})))*(X-540-200*sin(2*PI*N/(30*${period})))+(Y-600-100*cos(2*PI*N/(30*${period})))*(Y-600-100*cos(2*PI*N/(30*${period}))))/(80000)),0,255)':` +
      `g='clip(${Math.round(150 * dim)}*exp(-((X-540-200*sin(2*PI*N/(30*${period})))*(X-540-200*sin(2*PI*N/(30*${period})))+(Y-600-100*cos(2*PI*N/(30*${period})))*(Y-600-100*cos(2*PI*N/(30*${period}))))/(80000)),0,255)':` +
      `b='clip(${Math.round(80 * dim)}*exp(-((X-540-200*sin(2*PI*N/(30*${period})))*(X-540-200*sin(2*PI*N/(30*${period})))+(Y-600-100*cos(2*PI*N/(30*${period})))*(Y-600-100*cos(2*PI*N/(30*${period}))))/(80000)),0,255)'` +
      `[orbs];`,

    `[grid][orbs]blend=all_mode=screen[blended];`,

    `[blended]hue=h=${cfg.baseHue}+20*sin(2*PI*t/${period}),` +
    `vignette=PI/4.5,` +
    `format=yuv420p[final]`,
  ].join("\n");
}

/* ── Fallback: Simple Animated Gradient ────────────────────────────── */

async function generateFallbackGradient(
  ffmpegPath: string,
  outFile: string,
  cfg: LoopConfig
): Promise<void> {
  const dim = cfg.dimFactor;
  const period = cfg.loopDurationSec;

  // Simpler filter: animated radial gradient only
  const filter = [
    `color=c=black:s=1080x1920:r=30:d=${period}`,
    `geq=` +
      `r='clip(${Math.round(50 * dim)}*exp(-((X-540)*(X-540)+(Y-960)*(Y-960))/250000),0,255)':` +
      `g='clip(${Math.round(80 * dim)}*exp(-((X-540)*(X-540)+(Y-960)*(Y-960))/250000),0,255)':` +
      `b='clip(${Math.round(120 * dim)}*exp(-((X-540)*(X-540)+(Y-960)*(Y-960))/250000),0,255)'`,
    `hue=h=${cfg.baseHue}+40*sin(2*PI*t/${period})`,
    `vignette=PI/4`,
    `format=yuv420p`,
  ].join(",");

  const cmd = [
    `"${ffmpegPath}"`,
    `-y`,
    `-f lavfi`,
    `-i "${filter}"`,
    `-c:v libx264 -preset fast -crf 23`,
    `-t ${period}`,
    `-r 30 -an -pix_fmt yuv420p`,
    `"${outFile}"`,
  ].join(" ");

  await execAsync(cmd, { maxBuffer: 20 * 1024 * 1024, timeout: 120_000 });
}
