# YouTube OAuth Setup Guide

## Prerequisites

Your `.env` file already has:
- `YOUTUBE_CLIENT_ID` ✅
- `YOUTUBE_CLIENT_SECRET` ✅

You just need to get the **refresh token**.

---

## How to Get YouTube Refresh Token

### Step 1: Run the OAuth script

```bash
node get-youtube-token.js
```

### Step 2: What happens next

1. **Browser opens automatically** (Google OAuth page)
2. **Sign in** with your YouTube account
3. **Click "Allow"** to grant upload permissions
4. **Browser redirects** to success page
5. **Token saved automatically** to `.env`

### Expected Output

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🔐  YouTube Desktop OAuth Token Generator
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📡 Temporary loopback server started
   Listening on: http://localhost:56789

🌐 Opening browser for authentication...

✅ Authorization code received
   Exchanging for tokens...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ SUCCESS! Refresh token obtained:

   1//0gABCDEFGHIJKLMNOPQRSTUVWXYZ...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Saved to .env file automatically!

🚀 Ready to run: npm run generate -- "Your topic"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Now Test the Full Pipeline

```bash
npm run generate -- "Why AI will change everything in 2026"
```

This will:
1. ✅ Generate script via Groq
2. ✅ Create voice-over with Edge TTS
3. ✅ Render 1080×1920 Shorts video
4. ✅ Upload to YouTube publicly

---

## Troubleshooting

### "No refresh_token received"

Run this to revoke and try again:
1. Go to: https://myaccount.google.com/permissions
2. Find your app and click "Remove Access"
3. Run `node get-youtube-token.js` again

### Browser doesn't open

Copy the URL from terminal and open manually in your browser.

---

## Technical Details

- **OAuth Flow**: Desktop App (loopback redirect)
- **Port**: Randomly assigned (no conflicts)
- **Redirect URI**: `http://localhost:PORT` (auto-configured)
- **No manual configuration needed** in Google Cloud Console for Desktop apps
- **Refresh token**: Never expires (store safely)

---

## Security Notes

- The `.env` file contains sensitive credentials
- Never commit `.env` to Git (already in `.gitignore`)
- Refresh tokens allow permanent YouTube upload access
- Only share with trusted developers
