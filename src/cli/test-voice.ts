/**
 * Test ElevenLabs Voice
 * 
 * Generate a short test audio with your current ElevenLabs configuration
 * to verify the API key works and hear the voice quality.
 * 
 * Usage: npx ts-node src/cli/test-voice.ts
 */
import dotenv from "dotenv";
dotenv.config();

import path from "path";
import fs from "fs";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { Readable } from "stream";

const OUTPUT_DIR = path.resolve(__dirname, "../../output");

async function testElevenLabsVoice() {
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    console.error("❌ ELEVENLABS_API_KEY not found in .env file");
    process.exit(1);
  }

  console.log("\n🎙️  Testing ElevenLabs Voice Generation\n");
  console.log("═".repeat(60));

  // Test texts in different styles
  const testTexts = [
    {
      name: "English Professional",
      text: "Welcome to our AI-powered video generation platform. This is a test of the ElevenLabs voice synthesis.",
      voiceId: "ErXwobaYiN019PkySvjV", // Antoni
      model: "eleven_multilingual_v2",
    },
    {
      name: "Hinglish Casual (Raju Style)",
      text: "Arey yaar, technology kaafi interesting hai na? AI ka use karke hum videos automatically generate kar sakte hain!",
      voiceId: "ErXwobaYiN019PkySvjV", // Antoni
      model: "eleven_multilingual_v2",
    },
    {
      name: "Hindi Native",
      text: "नमस्ते दोस्तों! आज हम बात करेंगे AI और technology के बारे में। यह बहुत ही शानदार है!",
      voiceId: "ErXwobaYiN019PkySvjV", // Antoni
      model: "eleven_multilingual_v2",
    },
  ];

  const client = new ElevenLabsClient({ apiKey });

  for (const test of testTexts) {
    console.log(`\n📝 Testing: ${test.name}`);
    console.log(`   Text: "${test.text}"`);
    console.log(`   Voice ID: ${test.voiceId}`);
    console.log(`   Model: ${test.model}`);

    const outputFile = path.join(
      OUTPUT_DIR,
      `test_voice_${test.name.replace(/\s+/g, "_").toLowerCase()}.mp3`
    );

    try {
      console.log(`   → Generating audio...`);

      const audioStream = await client.textToSpeech.convert(test.voiceId, {
        text: test.text,
        modelId: test.model, // Use modelId for TypeScript SDK
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.0,
          use_speaker_boost: true,
        },
      } as any);

      // Save stream to file
      const chunks: any[] = [];
      for await (const chunk of audioStream) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);
      fs.writeFileSync(outputFile, buffer);

      const fileSizeKB = (fs.statSync(outputFile).size / 1024).toFixed(2);
      console.log(`   ✅ Saved: ${path.basename(outputFile)} (${fileSizeKB} KB)`);

    } catch (error: any) {
      console.error(`   ❌ Error: ${error.message}`);
      if (error.statusCode) {
        console.error(`   Status Code: ${error.statusCode}`);
      }
      if (error.body) {
        console.error(`   Details: ${JSON.stringify(error.body)}`);
      }
    }
  }

  console.log("\n" + "═".repeat(60));
  console.log("\n✅ Test Complete!\n");
  console.log("📂 Check the output folder for generated audio files:");
  console.log(`   ${OUTPUT_DIR}\n`);
  console.log("💡 Listen to the samples to evaluate voice quality.\n");
  console.log("🔧 To use different voices:");
  console.log("   1. Login to: https://elevenlabs.io/app/voice-library");
  console.log("   2. Find a voice you like and copy its Voice ID");
  console.log("   3. Update voiceId in src/lib/tts.ts\n");
}

// Run the test
testElevenLabsVoice().catch((err) => {
  console.error("\n❌ Fatal error:", err.message);
  process.exit(1);
});
