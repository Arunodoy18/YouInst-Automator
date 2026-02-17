/**
 * Background Engine — intelligent asset resolution with fallback chain
 *
 * Resolution priority:
 *   1. Local video from /assets/backgrounds/{mode}/
 *   2. Pexels stock video (via existing stockVideo.ts)
 *   3. null → caller should fall back to Remotion text-on-black render
 *
 * Supports .mp4, .webm, .mov, .avi, .mkv files.
 * Picks a random video from the matching folder to avoid repetition.
 */

import fs from "fs";
import path from "path";
import { type BackgroundMode } from "./visualSelector";
import { fetchStockVideo } from "./stockVideo";

/* ── Constants ─────────────────────────────────────────────────────── */

const ASSETS_ROOT = path.resolve(__dirname, "../../assets/backgrounds");
const VIDEO_EXTS = new Set([".mp4", ".webm", ".mov", ".avi", ".mkv"]);

/** Mode → Pexels search keywords for the stock-video fallback */
const MODE_SEARCH_QUERIES: Record<BackgroundMode, string> = {
  endless_runner: "running track aerial dark cinematic",
  temple_run: "ancient temple corridor stone ruins adventure cinematic",
  futuristic: "technology abstract dark neon loop",
  finance: "stock market graph dark particles",
  productivity: "minimalist desk workspace dark calm",
  high_energy: "fast motion abstract energy dark",
};

/* ── Public API ────────────────────────────────────────────────────── */

/**
 * Pick a background video for the given visual mode.
 *
 * @param mode      Background mode from the visual strategy
 * @param topic     Topic string (used as fallback Pexels query)
 * @param outputDir Directory for any downloaded files
 * @returns Absolute path to a video file, or null if nothing found
 */
export async function pickBackground(
  mode: BackgroundMode,
  topic: string,
  outputDir: string
): Promise<string | null> {
  // ── 1. Try local assets ─────────────────────────────────────────
  const localPath = getRandomLocalVideo(mode);
  if (localPath) {
    console.log(
      `  → Background: local asset [${mode}] → ${path.basename(localPath)}`
    );
    return localPath;
  }

  // ── 2. Fallback to Pexels stock search ──────────────────────────
  console.log(`  → No local ${mode} backgrounds, trying Pexels…`);
  const query = MODE_SEARCH_QUERIES[mode] || topic;
  try {
    const pexelsPath = await fetchStockVideo(query, outputDir);
    if (pexelsPath) {
      console.log(
        `  → Background: Pexels stock → ${path.basename(pexelsPath)}`
      );
      return pexelsPath;
    }
  } catch (err: any) {
    console.log(`  → Pexels fetch failed: ${err.message}`);
  }

  // ── 3. No background available ──────────────────────────────────
  console.log(
    "  → No background video available (will use Remotion fallback)"
  );
  return null;
}

/* ── Helpers ───────────────────────────────────────────────────────── */

/**
 * Scan the local assets directory for the given mode
 * and return a random video file path.
 */
function getRandomLocalVideo(mode: BackgroundMode): string | null {
  const modeDir = path.join(ASSETS_ROOT, mode);

  if (!fs.existsSync(modeDir)) {
    return null;
  }

  const files = fs.readdirSync(modeDir).filter((f) => {
    const ext = path.extname(f).toLowerCase();
    return VIDEO_EXTS.has(ext);
  });

  if (files.length === 0) {
    return null;
  }

  // Random pick for variety across runs
  const pick = files[Math.floor(Math.random() * files.length)];
  return path.join(modeDir, pick);
}
