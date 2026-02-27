/**
 * Test Edge TTS Indian Voices
 * 
 * Generate sample audio with all 5 Indian voice profiles
 * using the free Edge TTS (no ElevenLabs needed)
 * 
 * Usage: npx ts-node src/cli/test-indian-voices.ts
 */
import dotenv from "dotenv";
dotenv.config();

import path from "path";
import fs from "fs";
import { generateVoice, VOICE_PROFILES } from "../lib/tts";

const OUTPUT_DIR = path.resolve(__dirname, "../../output");

async function testIndianVoices() {
  console.log("\n🎙️  Testing Indian Voices (Edge TTS)\n");
  console.log("═".repeat(70));

  const testTexts = {
    raju: "Arey yaar, aaj main tumhe AI ke baare mein kuch interesting baatein bataunga! Technology kaafi amazing hai na?",
    default: "Welcome to AI-powered content generation. Today we'll explore how artificial intelligence is revolutionizing video creation.",
    madhur: "नमस्ते दोस्तों! आज हम बात करेंगे technology और AI के बारे में। यह बहुत ही interesting topic है!",
    swara: "AI और technology की duniya mein aaj bahut kuch ho raha hai. Chaliye dekhte hain kya naya hai.",
    neerja: "Hello everyone! Today we're going to discuss the fascinating world of artificial intelligence and automation."
  };

  const voiceIds = ["raju", "default", "madhur", "swara", "neerja"];

  for (const voiceId of voiceIds) {
    const profile = VOICE_PROFILES[voiceId];
    const text = testTexts[voiceId as keyof typeof testTexts];

    console.log(`\n🎤 Testing: ${profile.label}`);
    console.log(`   Voice: ${profile.voice.voice}`);
    console.log(`   Language: ${profile.language}`);
    console.log(`   Description: ${profile.description}`);
    console.log(`   Text: "${text}"`);

    const voiceOutputDir = path.join(OUTPUT_DIR, `test_${voiceId}`);

    try {
      console.log(`   → Generating audio...`);
      
      // generateVoice expects outputDir, not file path
      const outputFile = await generateVoice(text, voiceOutputDir, undefined, voiceId);
      
      // Copy to output root for easy access
      const finalPath = path.join(OUTPUT_DIR, `test_${voiceId}.mp3`);
      fs.copyFileSync(outputFile, finalPath);
      
      console.log(`   ✅ Saved: test_${voiceId}.mp3`);
    } catch (error: any) {
      console.error(`   ❌ Error: ${error.message}`);
    }
  }

  console.log("\n" + "═".repeat(70));
  console.log("\n✅ Test Complete!\n");
  console.log("📂 Audio files saved in: " + OUTPUT_DIR);
  console.log("\n🎧 Listen to the samples:");
  console.log("   test_raju.mp3      - Young energetic Hinglish (3 Idiots style)");
  console.log("   test_default.mp3   - Professional Indian-English male");
  console.log("   test_madhur.mp3    - Energetic Hindi male");
  console.log("   test_swara.mp3     - Authoritative Hindi female");
  console.log("   test_neerja.mp3    - Professional English female\n");
  
  console.log("💡 To use in your videos:");
  console.log("   npm run generate");
  console.log("   # Then select your preferred voice profile\n");
}

testIndianVoices().catch((err) => {
  console.error("\n❌ Fatal error:", err.message);
  process.exit(1);
});
