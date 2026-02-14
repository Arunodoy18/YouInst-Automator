/**
 * Desktop OAuth2 Script for YouTube API
 * 
 * This uses the Desktop App OAuth flow (loopback redirect).
 * No pre-configuration of redirect URIs needed in Google Cloud Console.
 * 
 * Run:  node get-youtube-token.js
 */

require('dotenv').config();
const { google } = require('googleapis');
const http = require('http');
const { URL } = require('url');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const CLIENT_ID = process.env.YOUTUBE_CLIENT_ID;
const CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET;
const SCOPES = ['https://www.googleapis.com/auth/youtube.upload'];

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('❌ Missing YOUTUBE_CLIENT_ID or YOUTUBE_CLIENT_SECRET in .env');
  process.exit(1);
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  🔐  YouTube Desktop OAuth Token Generator');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

/**
 * Desktop OAuth Flow:
 * 1. Start temporary loopback server on random port
 * 2. Generate auth URL with http://localhost:PORT
 * 3. Open browser
 * 4. Capture authorization code
 * 5. Exchange for refresh token
 * 6. Save to .env
 */
async function getRefreshToken() {
  return new Promise((resolve, reject) => {
    // Create temporary HTTP server to capture OAuth redirect
    const server = http.createServer();

    server.listen(0, 'localhost', () => {
      const port = server.address().port;
      const redirectUri = `http://localhost:${port}`;

      const oauth2Client = new google.auth.OAuth2(
        CLIENT_ID,
        CLIENT_SECRET,
        redirectUri
      );

      // Generate authorization URL
      const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
        prompt: 'consent', // Force to get refresh_token
      });

      console.log('📡 Temporary loopback server started');
      console.log(`   Listening on: ${redirectUri}\n`);
      console.log('🌐 Opening browser for authentication...\n');
      console.log('   If browser doesn\'t open, visit:\n');
      console.log(`   ${authUrl}\n`);

      // Open browser (Windows needs special handling for URLs with &)
      if (process.platform === 'win32') {
        exec(`start "" "${authUrl}"`);
      } else if (process.platform === 'darwin') {
        exec(`open "${authUrl}"`);
      } else {
        exec(`xdg-open "${authUrl}"`);
      }

      // Handle OAuth callback
      server.on('request', async (req, res) => {
        try {
          const url = new URL(req.url, redirectUri);
          
          if (url.pathname !== '/') {
            res.writeHead(404);
            res.end();
            return;
          }

          const code = url.searchParams.get('code');
          const error = url.searchParams.get('error');

          if (error) {
            console.error(`\n❌ Authorization failed: ${error}\n`);
            res.writeHead(400, { 'Content-Type': 'text/html' });
            res.end('<h1>Authorization Failed</h1><p>You can close this window.</p>');
            server.close();
            reject(new Error(error));
            return;
          }

          if (!code) {
            res.writeHead(400);
            res.end('No code received');
            server.close();
            reject(new Error('No authorization code received'));
            return;
          }

          console.log('✅ Authorization code received');
          console.log('   Exchanging for tokens...\n');

          // Exchange code for tokens
          const { tokens } = await oauth2Client.getToken(code);
          
          if (!tokens.refresh_token) {
            throw new Error(
              'No refresh_token received. Try revoking access at https://myaccount.google.com/permissions and run again.'
            );
          }

          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log('✅ SUCCESS! Refresh token obtained:\n');
          console.log(`   ${tokens.refresh_token}\n`);
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

          // Update .env file
          const envPath = path.join(__dirname, '.env');
          let envContent = fs.readFileSync(envPath, 'utf8');

          if (envContent.includes('YOUTUBE_REFRESH_TOKEN=')) {
            envContent = envContent.replace(
              /YOUTUBE_REFRESH_TOKEN=.*/,
              `YOUTUBE_REFRESH_TOKEN=${tokens.refresh_token}`
            );
          } else {
            envContent += `\nYOUTUBE_REFRESH_TOKEN=${tokens.refresh_token}\n`;
          }

          fs.writeFileSync(envPath, envContent);
          console.log('✅ Saved to .env file automatically!\n');
          console.log('🚀 Ready to run: npm run generate -- "Your topic"\n');

          // Success page
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(`
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <title>Authorization Successful</title>
              </head>
              <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; 
                          text-align: center; padding: 60px; background: #0a0a0a; color: #fff;">
                <h1 style="color: #4ade80; font-size: 48px;">✅</h1>
                <h2>Authorization Successful!</h2>
                <p style="color: #888;">Your refresh token has been saved to <code>.env</code></p>
                <p style="margin-top: 40px; color: #666;">You can close this window now.</p>
              </body>
            </html>
          `);

          server.close();
          resolve(tokens.refresh_token);

        } catch (err) {
          console.error('\n❌ Error during token exchange:', err.message);
          res.writeHead(500, { 'Content-Type': 'text/html' });
          res.end('<h1>Error</h1><p>Failed to exchange token. Check console.</p>');
          server.close();
          reject(err);
        }
      });
    });

    server.on('error', (err) => {
      console.error('❌ Server error:', err.message);
      reject(err);
    });
  });
}

// Run
getRefreshToken()
  .then(() => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ Failed:', err.message, '\n');
    process.exit(1);
  });
