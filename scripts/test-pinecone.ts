/**
 * Test Pinecone API Key
 * Verifies connection to Pinecone vector database
 */

import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

async function testPinecone() {
  const apiKey = process.env.PINECONE_API_KEY;

  if (!apiKey) {
    console.error("❌ PINECONE_API_KEY not found in .env");
    process.exit(1);
  }

  console.log("🔍 Testing Pinecone API key...");
  console.log(`   Key: ${apiKey.substring(0, 20)}...`);

  try {
    // Test API key by listing indexes
    const response = await axios.get(
      "https://api.pinecone.io/indexes",
      {
        headers: {
          "Api-Key": apiKey,
          "Content-Type": "application/json",
        },
      }
    );

    const indexes = response.data.indexes || [];
    console.log("\n✅ Pinecone API is working!");
    console.log(`   Found ${indexes.length} index(es)`);
    
    if (indexes.length > 0) {
      console.log("\n📊 Available indexes:");
      indexes.forEach((index: any) => {
        console.log(`   • ${index.name} (${index.dimension} dimensions, ${index.metric} metric)`);
      });
    } else {
      console.log("\n💡 No indexes found. Create one at: https://app.pinecone.io/");
    }

    return true;
  } catch (error: any) {
    console.error("\n❌ Pinecone API test failed:");
    
    if (error.response?.status === 401 || error.response?.status === 403) {
      console.error("   Invalid API key (401/403 Unauthorized)");
    } else if (error.response?.status === 404) {
      console.error("   Endpoint not found - check API version");
    } else if (error.response?.data) {
      console.error(`   ${JSON.stringify(error.response.data, null, 2)}`);
    } else {
      console.error(`   ${error.message}`);
    }
    
    process.exit(1);
  }
}

testPinecone();
