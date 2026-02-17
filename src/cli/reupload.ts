/**
 * Re-upload Script — Upload an existing video to YouTube + Instagram
 *
 * Usage:
 *   npx ts-node src/cli/reupload.ts <videoPath> [title] [caption]
 *
 * Example:
 *   npx ts-node src/cli/reupload.ts output/tech-1771349719617/video.mp4
 */
import dotenv from "dotenv";
dotenv.config();

import path from "path";
import fs from "fs";
import { uploadToYouTube } from "../lib/youtube";
import { uploadToTempHost } from "../lib/tempHosting";
import { uploadToInstagram, isInstagramConfigured } from "../lib/instagram";

async function main() {
  const args = process.argv.slice(2);
  const videoPath = args[0];

  if (!videoPath || !fs.existsSync(videoPath)) {
    console.error("\n  Usage: npx ts-node src/cli/reupload.ts <videoPath> [title] [caption]");
    console.error("  Example: npx ts-node src/cli/reupload.ts output/tech-1771349719617/video.mp4\n");
    process.exit(1);
  }

  const absPath = path.resolve(videoPath);
  const stats = fs.statSync(absPath);
  console.log(`\n  Video: ${absPath} (${(stats.size / 1024 / 1024).toFixed(1)} MB)`);

  const title = args[1] || "🐳 Docker vs Kubernetes — REAL Difference in 30 Seconds #Shorts";
  const description = args[2] || [
    "Docker packages your app. Kubernetes manages 1000s of them.",
    "Most devs confuse the two — here's the truth in 30 seconds! 🚀",
    "",
    "🔥 Docker = shipping container for your code",
    "🔥 Kubernetes = the port authority managing ALL containers",
    "",
    "Follow for more tech knowledge! 💡",
    "",
    "#Docker #Kubernetes #DevOps #CloudComputing #Tech #Shorts #Programming #Containers #K8s #SoftwareEngineering",
  ].join("\n");

  const caption = args[3] || [
    "🐳 Docker vs Kubernetes — the difference NOBODY explains properly! 🔥",
    "",
    "Docker = container for your app",
    "Kubernetes = orchestrator for ALL containers",
    "",
    "Save this for reference! 💾",
    "",
    "#Docker #Kubernetes #DevOps #CloudComputing #Tech",
    "#Programming #Containers #K8s #SoftwareEngineering",
    "#CodingTips #TechShorts #LearnToCode #BackendDev",
    "#Microservices #CloudNative #CICD #Automation",
    "#TechExplained #CodeNewbie #SWE",
  ].join("\n");

  console.log(`  Title: ${title}`);
  console.log(`  ────────────────────────────────────────`);

  // ── YouTube Upload ──
  let ytUrl = "";
  try {
    console.log("\n  [1/2] Uploading to YouTube Shorts…");
    ytUrl = await uploadToYouTube(absPath, title, description);
    console.log(`  ✅ YouTube: ${ytUrl}`);
  } catch (err: any) {
    console.error(`  ❌ YouTube failed: ${err.message}`);
  }

  // ── Instagram Upload ──
  let igUrl = "";
  if (isInstagramConfigured()) {
    try {
      console.log("\n  [2/2] Uploading to Instagram Reels…");

      // Host video publicly for Instagram ingestion
      console.log("  → Hosting video temporarily…");
      const publicUrl = await uploadToTempHost(absPath);
      console.log(`  → Public URL: ${publicUrl}`);

      const result = await uploadToInstagram(publicUrl, caption);
      igUrl = result.url;
      console.log(`  ✅ Instagram: ${igUrl}`);
    } catch (err: any) {
      console.error(`  ❌ Instagram failed: ${err.message}`);
    }
  } else {
    console.log("\n  [2/2] Instagram: Skipped (not configured)");
  }

  // ── Summary ──
  console.log("\n  ════════════════════════════════════════");
  console.log("  UPLOAD SUMMARY");
  console.log("  ════════════════════════════════════════");
  if (ytUrl) console.log(`  YouTube:   ${ytUrl}`);
  else console.log("  YouTube:   ❌ Failed");
  if (igUrl) console.log(`  Instagram: ${igUrl}`);
  else if (!isInstagramConfigured()) console.log("  Instagram: ⏭ Not configured");
  else console.log("  Instagram: ❌ Failed");
  console.log("  ════════════════════════════════════════\n");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
