/**
 * List ElevenLabs Voices
 * 
 * Query your ElevenLabs API key to see all available voices,
 * with special attention to Indian/Bollywood voices and celebrity voices.
 * 
 * Usage: npx ts-node src/cli/list-elevenlabs-voices.ts
 */
import dotenv from "dotenv";
dotenv.config();

import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

async function listElevenLabsVoices() {
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    console.error("❌ ELEVENLABS_API_KEY not found in .env file");
    process.exit(1);
  }

  console.log("\n🎙️  Fetching ElevenLabs voices from your account...\n");

  try {
    const client = new ElevenLabsClient({ apiKey });
    
    // Fetch all available voices
    const voicesResponse = await client.voices.getAll();
    const voices = voicesResponse.voices || [];

    if (voices.length === 0) {
      console.log("⚠️  No voices found. Your account may not have access to voices yet.");
      return;
    }

    console.log(`✅ Found ${voices.length} voices in your account\n`);
    console.log("═".repeat(80));

    // Categorize voices
    const indianVoices: any[] = [];
    const bollywoodVoices: any[] = [];
    const celebrityVoices: any[] = [];
    const yourVoices: any[] = [];
    const otherVoices: any[] = [];

    for (const voice of voices) {
      const name = voice.name?.toLowerCase() || "";
      const labels = voice.labels || {};
      const description = voice.description?.toLowerCase() || "";
      const category = voice.category || "";

      // Check if it's your cloned voice
      if (category === "cloned" || category === "generated") {
        yourVoices.push(voice);
      }
      // Check for Indian/Hindi/Bollywood keywords
      else if (
        name.includes("indian") ||
        name.includes("hindi") ||
        name.includes("bollywood") ||
        description.includes("indian") ||
        description.includes("hindi") ||
        description.includes("bollywood") ||
        labels.accent?.includes("indian")
      ) {
        indianVoices.push(voice);
      }
      // Check for celebrity/actor voices
      else if (
        name.includes("actor") ||
        name.includes("celebrity") ||
        description.includes("actor") ||
        description.includes("celebrity") ||
        category === "professional"
      ) {
        celebrityVoices.push(voice);
      }
      // Check specifically for Bollywood
      else if (
        name.includes("shah rukh") ||
        name.includes("amitabh") ||
        name.includes("akshay") ||
        name.includes("salman") ||
        name.includes("aamir")
      ) {
        bollywoodVoices.push(voice);
      } else {
        otherVoices.push(voice);
      }
    }

    // Display categorized voices
    if (yourVoices.length > 0) {
      console.log("\n🎤 YOUR CLONED VOICES:");
      console.log("─".repeat(80));
      yourVoices.forEach((v) => printVoice(v));
    }

    if (bollywoodVoices.length > 0) {
      console.log("\n🎬 BOLLYWOOD ACTOR VOICES:");
      console.log("─".repeat(80));
      bollywoodVoices.forEach((v) => printVoice(v));
    }

    if (indianVoices.length > 0) {
      console.log("\n🇮🇳 INDIAN/HINDI VOICES:");
      console.log("─".repeat(80));
      indianVoices.forEach((v) => printVoice(v));
    }

    if (celebrityVoices.length > 0) {
      console.log("\n⭐ CELEBRITY/PROFESSIONAL VOICES:");
      console.log("─".repeat(80));
      celebrityVoices.forEach((v) => printVoice(v));
    }

    if (otherVoices.length > 0) {
      console.log("\n🌍 OTHER AVAILABLE VOICES:");
      console.log("─".repeat(80));
      otherVoices.slice(0, 20).forEach((v) => printVoice(v)); // Show first 20
      if (otherVoices.length > 20) {
        console.log(`\n... and ${otherVoices.length - 20} more voices`);
      }
    }

    console.log("\n" + "═".repeat(80));
    console.log("\n📋 SUMMARY:");
    console.log(`   Your Cloned Voices:     ${yourVoices.length}`);
    console.log(`   Bollywood Actor Voices: ${bollywoodVoices.length}`);
    console.log(`   Indian/Hindi Voices:    ${indianVoices.length}`);
    console.log(`   Celebrity Voices:       ${celebrityVoices.length}`);
    console.log(`   Other Voices:           ${otherVoices.length}`);
    console.log(`   Total:                  ${voices.length}`);

    // Show how to use a voice
    if (voices.length > 0) {
      const exampleVoice = yourVoices[0] || indianVoices[0] || voices[0];
      console.log("\n💡 TO USE A VOICE:");
      console.log(`   Edit src/lib/tts.ts and add to VOICE_PROFILES:`);
      console.log(`
   my_voice: {
     id: "my_voice",
     label: "${exampleVoice.name}",
     description: "${exampleVoice.description || 'Custom voice'}",
     voice: { voice: "en-IN-PrabhatNeural", rate: "+2%", pitch: "+1Hz" },
     language: "hinglish",
     humanize: { breathPauses: true, fillers: true, rateVariation: true },
     elevenlabs: {
       voiceId: "${exampleVoice.voice_id}",
       modelId: "eleven_multilingual_v2",
     },
   },
      `);
    }

    console.log("\n✅ Done!\n");

  } catch (error: any) {
    console.error("\n❌ Error fetching voices:");
    console.error(error.message);
    if (error.statusCode === 401) {
      console.error("\n⚠️  Authentication failed. Check your ELEVENLABS_API_KEY in .env");
    }
    process.exit(1);
  }
}

function printVoice(voice: any) {
  const name = voice.name || "Unnamed";
  const voiceId = voice.voice_id || "N/A";
  const category = voice.category || "unknown";
  const description = voice.description || "No description";
  const labels = voice.labels || {};
  
  console.log(`\n  🎙️  ${name}`);
  console.log(`      ID: ${voiceId}`);
  console.log(`      Category: ${category}`);
  console.log(`      Description: ${description}`);
  
  if (Object.keys(labels).length > 0) {
    const labelStr = Object.entries(labels)
      .map(([k, v]) => `${k}: ${v}`)
      .join(", ");
    console.log(`      Labels: ${labelStr}`);
  }
}

// Run the script
listElevenLabsVoices().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
