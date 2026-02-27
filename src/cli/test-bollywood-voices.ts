/**
 * Test Cinema-Quality Bollywood Voices
 * 
 * Test Raju (Sharman Joshi) and Salman Khan voice profiles
 * with pure Hindi and pure English (no mixing)
 * 
 * Usage: npx ts-node src/cli/test-bollywood-voices.ts
 */
import dotenv from "dotenv";
dotenv.config();

import path from "path";
import fs from "fs";
import { generateVoice, VOICE_PROFILES } from "../lib/tts";

const OUTPUT_DIR = path.resolve(__dirname, "../../output");

async function testBollywoodVoices() {
  console.log("\n🎬 Testing Cinema-Quality Bollywood Voices\n");
  console.log("═".repeat(70));

  const testScripts = {
    raju_hindi: {
      text: "दोस्तों, आज मैं आपको बताऊंगा कि AI और टेक्नोलॉजी कैसे हमारी ज़िन्दगी बदल रही है। यह बहुत ही interesting है यार! सुनो, technology के साथ अब सब कुछ possible है।",
      description: "Raju from 3 Idiots - Pure Hindi with cinema accent"
    },
    raju_english: {
      text: "Hey everyone! Today I'm going to tell you how AI and technology are changing our lives. This is really amazing! Listen, with technology everything is possible now.",
      description: "Raju from 3 Idiots - English with Indian accent"
    },
    salman_hindi: {
      text: "देखो भाई, ज़िन्दगी में बड़े सपने देखो। टेक्नोलॉजी और AI का ज़माना है। आज जो impossible लगता है, कल वो possible हो सकता है। यहाँ कोई असंभव नहीं है।",
      description: "Salman Khan - Deep, authoritative pure Hindi"
    },
    salman_english: {
      text: "Look my friend, dream big in life. This is the era of technology and AI. What seems impossible today can become possible tomorrow. Nothing is impossible here.",
      description: "Salman Khan - Deep, confident English with Indian accent"
    }
  };

  const voiceIds = ["raju_hindi", "raju_english", "salman_hindi", "salman_english"];

  for (const voiceId of voiceIds) {
    const profile = VOICE_PROFILES[voiceId];
    const script = testScripts[voiceId as keyof typeof testScripts];

    console.log(`\n🎤 ${profile.label}`);
    console.log(`   Voice Engine: ${profile.voice.voice}`);
    console.log(`   Language: ${profile.language.toUpperCase()}`);
    console.log(`   Style: ${script.description}`);
    console.log(`   Script: "${script.text}"`);

    const voiceOutputDir = path.join(OUTPUT_DIR, `cinema_${voiceId}`);

    try {
      console.log(`   → Generating cinema-quality audio...`);
      
      const outputFile = await generateVoice(script.text, voiceOutputDir, undefined, voiceId);
      
      // Copy to output root
      const finalPath = path.join(OUTPUT_DIR, `cinema_${voiceId}.mp3`);
      fs.copyFileSync(outputFile, finalPath);
      
      const fileSizeKB = (fs.statSync(finalPath).size / 1024).toFixed(2);
      console.log(`   ✅ Saved: cinema_${voiceId}.mp3 (${fileSizeKB} KB)`);
    } catch (error: any) {
      console.error(`   ❌ Error: ${error.message}`);
    }
  }

  console.log("\n" + "═".repeat(70));
  console.log("\n✅ Cinema-Quality Voice Generation Complete!\n");
  console.log("📂 Audio files saved in: " + OUTPUT_DIR);
  console.log("\n🎧 Listen to compare the authentic Bollywood voices:\n");
  console.log("   cinema_raju_hindi.mp3      - Raju (3 Idiots) Pure Hindi 🔥");
  console.log("   cinema_raju_english.mp3    - Raju (3 Idiots) English");
  console.log("   cinema_salman_hindi.mp3    - Salman Khan Pure Hindi ⭐");
  console.log("   cinema_salman_english.mp3  - Salman Khan English\n");
  
  console.log("💡 Voice Characteristics:\n");
  console.log("   RAJU (Sharman Joshi style):");
  console.log("   - Young, energetic delivery (+8% speed)");
  console.log("   - Higher pitch (+3Hz) for youthful tone");
  console.log("   - Excited, animated expression");
  console.log("   - Natural breath pauses and fillers\n");
  
  console.log("   SALMAN KHAN style:");
  console.log("   - Deep, authoritative voice (-2Hz pitch)");
  console.log("   - Confident, moderate pace (+2% speed)");
  console.log("   - Masculine, controlled delivery");
  console.log("   - Cinema-quality expression\n");
  
  console.log("🎬 To use in your videos:");
  console.log("   npm run generate");
  console.log("   # Select voice:");
  console.log("   - 'raju_hindi' for Hindi Raju style");
  console.log("   - 'raju_english' for English Raju style");
  console.log("   - 'salman_hindi' for Hindi Salman style");
  console.log("   - 'salman_english' for English Salman style\n");
  
  console.log("⚠️  IMPORTANT:");
  console.log("   - NO language mixing in a single video");
  console.log("   - Hindi videos = Pure Hindi only");
  console.log("   - English videos = Pure English only");
  console.log("   - Cinema-authentic accents maintained\n");
}

testBollywoodVoices().catch((err) => {
  console.error("\n❌ Fatal error:", err.message);
  process.exit(1);
});
