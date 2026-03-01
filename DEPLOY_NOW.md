# 🚀 Deploy to Render - Quick Start (5 Minutes)

## Your Repository is Ready! ✅

**Last Commit:** `7da721b` - Caption overlay system fixed + ElevenLabs integration  
**Repository:** https://github.com/Arunodoy18/YouInst-Automator  
**Status:** All systems verified and operational

---

## Step-by-Step Deployment

### 1️⃣ Generate Production Secrets (30 seconds)

Run this locally to generate your production secrets:

```bash
# Generate NEXTAUTH_SECRET
openssl rand -base64 48
# Copy the output - you'll need it in step 3
```

---

### 2️⃣ Go to Render.com (1 minute)

1. Visit [render.com](https://render.com)
2. Sign up/login with GitHub
3. Click **New** → **Blueprint**
4. Click **Connect a repository**
5. Authorize Render to access your GitHub
6. Select: `Arunodoy18/YouInst-Automator`

---

### 3️⃣ Configure Environment (2 minutes)

Render will detect `render.yaml` automatically. Fill in these variables:

**Required Variables:**
```env
GROQ_API_KEY=<your existing Groq API key from .env>
ELEVENLABS_API_KEY=<your existing ElevenLabs API key from .env>
NEXTAUTH_SECRET=<paste the secret you generated in step 1>
NEXTAUTH_URL=https://youinst-ai.onrender.com
```

**Tip:** Copy your API keys from your local `.env` file.

**Optional (Already Configured):**
```env
YOUTUBE_CLIENT_ID=<your existing>
YOUTUBE_CLIENT_SECRET=<your existing>
YOUTUBE_REFRESH_TOKEN=<your existing>
INSTAGRAM_ACCESS_TOKEN=<your existing>
INSTAGRAM_BUSINESS_ACCOUNT_ID=<your existing>
```

**Note:** Update `NEXTAUTH_URL` to match YOUR Render service name in step 4.

---

### 4️⃣ Name Your Service (30 seconds)

Choose a service name (lowercase, no spaces):
- Example: `youinst-buildc3`
- Example: `buildc3-automator`
- Your URL will be: `https://your-name.onrender.com`

**Go back to step 3 and update `NEXTAUTH_URL` with your chosen name!**

---

### 5️⃣ Deploy! (30 seconds + 5 min build)

1. Click **Apply**
2. Render will:
   - ✅ Create PostgreSQL database
   - ✅ Create Redis instance
   - ✅ Build Docker containers (webapp + workers)
   - ✅ Start services
3. Watch the build logs
4. Wait ~5 minutes for first deployment

---

### 6️⃣ Verify Deployment (1 minute)

Once deployed:

1. **Visit your dashboard:**
   ```
   https://your-service-name.onrender.com
   ```

2. **Check API health:**
   ```
   https://your-service-name.onrender.com/api/health
   ```
   Should return: `{"status": "ok"}`

3. **Generate your first video:**
   - Login to dashboard
   - Select niche: `tech`
   - Click "Generate Video"
   - Monitor progress in real-time

---

## 🎉 Success Checklist

After deployment, verify:

- [ ] Dashboard loads at your Render URL
- [ ] API health endpoint returns `{"status": "ok"}`
- [ ] Can create YouTube/Instagram posts from dashboard
- [ ] Worker logs show pipeline processing
- [ ] Videos upload to YouTube/Instagram successfully

---

## 🔧 Post-Deployment

### View Logs
```bash
# From Render Dashboard:
1. Click on "youinst-ai" service
2. Go to "Logs" tab
3. Watch real-time pipeline execution
```

### Scale Up (Optional)
```
Free Tier:  Sleeps after 15 min inactivity
Paid $7/mo: Always-on + faster builds
Paid $25/mo: 2GB RAM = faster video rendering
```

### Update Deployment
```bash
# Make changes locally
git add .
git commit -m "New feature"
git push origin main
# Render auto-deploys in ~5 minutes
```

---

## 📊 Expected Costs

| Service | Free Tier | Paid |
|---------|-----------|------|
| **Web Service** | Sleeps after 15 min | $7/mo (always-on) |
| **PostgreSQL** | 1GB free | $7/mo (more storage) |
| **Redis** | 25MB free | $10/mo (more memory) |
| **Workers** | Included | Included |
| **Total** | **$0** (with sleep) | **$7-24/mo** |

---

## 🆘 Troubleshooting

**Build fails?**
```bash
# Check Render logs for errors
# Common issues:
1. NEXTAUTH_SECRET not set → Generate with openssl
2. DATABASE_URL wrong → Should be postgres:// (Render auto-sets)
3. Python deps fail → render.yaml already handles this
```

**Videos not generating?**
```bash
# Check worker logs
# Verify API keys are set correctly
# Ensure GROQ_API_KEY and ELEVENLABS_API_KEY are correct
```

**Dashboard won't load?**
```bash
# Verify NEXTAUTH_URL matches your Render URL
# Check if service is sleeping (free tier)
# Upgrade to paid plan for always-on
```

---

## 🎯 Ready to Deploy?

**Your checklist:**
- ✅ Repository is ready
- ✅ All code is committed
- ✅ API keys are configured
- ⏳ Generate NEXTAUTH_SECRET
- ⏳ Go to render.com
- ⏳ Click "New Blueprint"
- ⏳ Deploy!

**Time to production: 5 minutes** ⚡

Go to: [render.com/deploy](https://render.com) 🚀
