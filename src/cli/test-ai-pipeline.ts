#!/usr/bin/env node
/**
 * Test Script for Open Source AI Pipeline
 * Verifies VoiceBox, Golpo, bobaAnime, and Reroll integration
 */

import { testAIPipeline } from "../lib/aiOrchestrator";
import { isVoiceBoxInstalled, installVoiceBox } from "../lib/voicebox";
import { checkGolpoHealth } from "../lib/golpo";
import { checkBobaAnimeHealth } from "../lib/bobaAnime";
import { checkRerollHealth } from "../lib/reroll";

async function main() {
  console.log("\n🧪 Open Source AI Pipeline Test");
  console.log("════════════════════════════════════════════════════");
  console.log("");

  console.log("📋 Step 1: Checking prerequisites...\n");

  // Check VoiceBox
  console.log("  [1/4] VoiceBox (Meta TTS)");
  const voiceBoxInstalled = await isVoiceBoxInstalled();
  if (voiceBoxInstalled) {
    console.log("    ✅ Installed");
  } else {
    console.log("    ⚠️  Not installed");
    console.log("    📦 Installing VoiceBox...");
    try {
      await installVoiceBox();
      console.log("    ✅ Installation complete");
    } catch (error: any) {
      console.log(`    ❌ Installation failed: ${error.message}`);
      console.log("    💡 Install manually: pip install metavoice");
    }
  }

  // Check Golpo
  console.log("\n  [2/4] Golpo API (Video Generation)");
  const golpoHealthy = await checkGolpoHealth();
  if (golpoHealthy) {
    console.log("    ✅ Connected");
  } else {
    console.log("    ⚠️  Not configured");
    console.log("    💡 Set GOLPO_API_KEY in .env file");
    console.log("    🔗 Get API key: https://golpo.ai/signup");
  }

  // Check bobaAnime
  console.log("\n  [3/4] bobaAnime API (Anime Videos)");
  const bobaHealthy = await checkBobaAnimeHealth();
  if (bobaHealthy) {
    console.log("    ✅ Connected");
  } else {
    console.log("    ⚠️  Not configured");
    console.log("    💡 Set BOBA_ANIME_API_KEY in .env file");
    console.log("    🔗 Get API key: https://boba-anime.com/signup");
  }

  // Check Reroll
  console.log("\n  [4/4] Reroll API (Enhancement)");
  const rerollHealthy = await checkRerollHealth();
  if (rerollHealthy) {
    console.log("    ✅ Connected");
  } else {
    console.log("    ⚠️  Not configured (optional)");
    console.log("    💡 Set REROLL_API_KEY in .env file");
    console.log("    🔗 Get API key: https://reroll.ai/signup");
  }

  console.log("\n" + "─".repeat(60));

  // Check if we can proceed with test
  const canProceed = voiceBoxInstalled && (golpoHealthy || bobaHealthy);
  
  if (!canProceed) {
    console.log("\n❌ Cannot run test video generation");
    console.log("\n📝 Requirements:");
    console.log("  • VoiceBox installed (pip install metavoice)");
    console.log("  • At least one video API configured (Golpo or bobaAnime)");
    console.log("\n💡 Once configured, run: npm run test:ai\n");
    process.exit(1);
  }

  // Proceed with test
  console.log("\n✅ All prerequisites met!");
  console.log("\n🎬 Step 2: Running test video generation...\n");

  try {
    await testAIPipeline();
    console.log("\n✅ Test complete! Check output/ folder for the video.\n");
  } catch (error: any) {
    console.error(`\n❌ Test failed: ${error.message}\n`);
    process.exit(1);
  }
}

// Run
main().catch(console.error);
