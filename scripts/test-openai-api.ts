/**
 * Quick OpenAI API Test
 * Makes a real API call to verify the key works
 */

import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

async function testOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.error("❌ OPENAI_API_KEY not found in .env");
    process.exit(1);
  }

  console.log("🔑 Testing OpenAI API key...");
  console.log(`   Key: ${apiKey.substring(0, 15)}...`);

  try {
    const openai = new OpenAI({ apiKey });

    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        { role: "user", content: "Say 'API working!' in exactly 2 words." },
      ],
      max_tokens: 10,
    });

    const reply = response.choices[0].message.content;
    console.log("\n✅ OpenAI API is working!");
    console.log(`   Response: ${reply}`);
    console.log(`   Model: ${response.model}`);
    console.log(`   Tokens used: ${response.usage?.total_tokens}`);
  } catch (error: any) {
    console.error("\n❌ OpenAI API test failed:");
    if (error.status === 401) {
      console.error("   Invalid API key");
    } else if (error.status === 429) {
      console.error("   Rate limit exceeded or quota reached");
    } else {
      console.error(`   ${error.message}`);
    }
    process.exit(1);
  }
}

testOpenAI();
