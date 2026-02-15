/**
 * Instagram Long-Lived Token Exchange Script
 * 
 * Exchanges a short-lived User Access Token (1 hour) for a Long-Lived Token (60 days).
 * Automatically updates the .env file with the new token.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Read current .env file
const envPath = path.resolve(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');

// Extract current values
const appIdMatch = envContent.match(/# App ID: (\d+)/);
const appSecretMatch = envContent.match(/# App Secret: ([a-f0-9]+)/);
const tokenMatch = envContent.match(/INSTAGRAM_ACCESS_TOKEN=(.+)/);

const APP_ID = '2147472912695700';
const APP_SECRET = '50e666ca01fc87eeb88fe1';
const SHORT_LIVED_TOKEN = tokenMatch ? tokenMatch[1].trim() : '';

if (!SHORT_LIVED_TOKEN) {
  console.error('❌ Error: No Instagram access token found in .env file');
  process.exit(1);
}

console.log('🔄 Exchanging short-lived token for long-lived token...');
console.log(`   App ID: ${APP_ID}`);
console.log(`   Short token: ${SHORT_LIVED_TOKEN.substring(0, 20)}...`);

// Build the Instagram Graph API URL (different from Facebook exchange endpoint)
const url = `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${APP_SECRET}&access_token=${SHORT_LIVED_TOKEN}`;

https.get(url, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      
      if (response.error) {
        console.error('❌ Error from Facebook API:');
        console.error(`   ${response.error.message}`);
        console.error(`   Type: ${response.error.type}`);
        process.exit(1);
      }
      
      if (response.access_token) {
        const longLivedToken = response.access_token;
        const expiresIn = response.expires_in || 5184000; // 60 days in seconds
        const expiryDate = new Date(Date.now() + expiresIn * 1000);
        
        console.log('✅ Long-lived token received!');
        console.log(`   Expires in: ${Math.floor(expiresIn / 86400)} days`);
        console.log(`   Expiry date: ${expiryDate.toISOString().split('T')[0]}`);
        console.log(`   Token: ${longLivedToken.substring(0, 20)}...`);
        
        // Update .env file
        const updatedEnv = envContent.replace(
          /INSTAGRAM_ACCESS_TOKEN=.*/,
          `INSTAGRAM_ACCESS_TOKEN=${longLivedToken}`
        );
        
        fs.writeFileSync(envPath, updatedEnv, 'utf-8');
        console.log('✅ .env file updated with long-lived token!');
        console.log('\n📝 Next steps:');
        console.log('   1. This token will last 60 days');
        console.log('   2. Set a reminder to refresh it before expiry');
        console.log('   3. Run this script again when it expires');
        console.log('   4. You can now upload to Instagram for 60 days!');
      } else {
        console.error('❌ Unexpected response format');
        console.error(JSON.stringify(response, null, 2));
        process.exit(1);
      }
    } catch (err) {
      console.error('❌ Failed to parse response:');
      console.error(err.message);
      console.error('Raw response:', data);
      process.exit(1);
    }
  });
}).on('error', (err) => {
  console.error('❌ Network error:');
  console.error(err.message);
  process.exit(1);
});
