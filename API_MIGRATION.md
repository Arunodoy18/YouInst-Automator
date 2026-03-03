# 🔄 API Migration: Groq → OpenAI

## What Changed?

Migrated from **Groq SDK** to **OpenAI SDK** for all AI text generation tasks.

---

## Why OpenAI?

| Feature | Groq | OpenAI |
|---------|------|--------|
| **Model** | Llama 3.3 70B | **GPT-4 Turbo** |
| **Quality** | Good | **Better** |
| **Reliability** | Beta service | **Production-grade** |
| **API Stability** | Developing | **Mature & stable** |
| **Rate Limits** | 30 req/min (free) | **3,500 req/min** |
| **Documentation** | Limited | **Comprehensive** |
| **Cost** | Free (limited) | **$0.01-0.03/1K tokens** |

---

## What Was Updated

### 1. **Package Dependency**
```diff
- "groq-sdk": "^0.8.0"
+ "openai": "^4.28.0"
```

### 2. **Environment Variable**
```diff
- GROQ_API_KEY=gsk_your_key_here
+ OPENAI_API_KEY=sk-proj-your_key_here
```

**Get your API key:** https://platform.openai.com/api-keys

### 3. **AI Model**
```diff
- Model: llama-3.3-70b-versatile
+ Model: gpt-4-turbo-preview
```

### 4. **Updated Files**

**TypeScript Source Files:**
- ✅ [src/lib/groq.ts](src/lib/groq.ts)
- ✅ [src/lib/agentBrain.ts](src/lib/agentBrain.ts)
- ✅ [src/lib/factResearch.ts](src/lib/factResearch.ts)
- ✅ [src/lib/factContentEngine.ts](src/lib/factContentEngine.ts)
- ✅ [src/lib/performanceOptimizer.ts](src/lib/performanceOptimizer.ts)
- ✅ [src/lib/retentionScorer.ts](src/lib/retentionScorer.ts)
- ✅ [src/lib/viralScorer.ts](src/lib/viralScorer.ts)

**Configuration & Documentation:**
- ✅ [.env.example](.env.example)
- ✅ [package.json](package.json)
- ✅ [scripts/verify-system.ts](scripts/verify-system.ts)
- ✅ [webapp/src/lib/validateEnv.ts](webapp/src/lib/validateEnv.ts)
- ✅ [DEPLOY_NETLIFY_RENDER.md](DEPLOY_NETLIFY_RENDER.md)
- ✅ [QUICKSTART_AI.md](QUICKSTART_AI.md)

---

## How to Update Your Local Environment

### Step 1: Update `.env` file

```bash
# Open your .env file and replace:
GROQ_API_KEY=gsk_...

# With:
OPENAI_API_KEY=sk-proj-...
```

### Step 2: Get OpenAI API Key

1. Go to: https://platform.openai.com/api-keys
2. Sign up or log in
3. Click **"Create new secret key"**
4. Copy the key (starts with `sk-proj-` or `sk-`)
5. Paste into your `.env` file

### Step 3: Install Dependencies

```bash
npm install
```

### Step 4: Verify Setup

```bash
npm run verify
```

You should see:
```
✅ OpenAI API Key: sk-proj-xxx...
```

---

## Code Changes Example

### Before (Groq):
```typescript
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const result = await groq.chat.completions.create({
  messages: [{ role: "user", content: prompt }],
  model: "llama-3.3-70b-versatile",
  temperature: 0.9,
});
```

### After (OpenAI):
```typescript
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const result = await openai.chat.completions.create({
  messages: [{ role: "user", content: prompt }],
  model: "gpt-4-turbo-preview",
  temperature: 0.9,
});
```

---

## OpenAI Pricing

| Model | Input | Output | Context Window |
|-------|-------|--------|----------------|
| **GPT-4 Turbo** | $0.01/1K tokens | $0.03/1K tokens | 128K tokens |
| **GPT-3.5 Turbo** | $0.0005/1K tokens | $0.0015/1K tokens | 16K tokens |

**Estimated Cost per Video:**
- Script generation: ~500 tokens = **$0.005 - $0.015**
- Total for 100 videos/month: **$0.50 - $1.50**

💡 **Much cheaper than ElevenLabs voice ($5-99/mo)!**

---

## Benefits of This Migration

1. ✅ **Better Quality Scripts** - GPT-4 Turbo produces more natural, engaging content
2. ✅ **Higher Rate Limits** - 3,500 requests/minute vs Groq's 30/minute
3. ✅ **More Reliable** - Production-grade API with 99.9% uptime SLA
4. ✅ **Better Documentation** - Comprehensive guides and examples
5. ✅ **Longer Context** - 128K tokens vs Groq's smaller context window
6. ✅ **Future-Proof** - OpenAI is industry standard, actively developed

---

## Troubleshooting

### Error: "Incorrect API key provided"

```bash
# Check your API key format
echo $OPENAI_API_KEY

# Should start with: sk-proj- or sk-
# If not, get a new key from: https://platform.openai.com/api-keys
```

### Error: "Rate limit exceeded"

```bash
# Check your OpenAI usage dashboard:
# https://platform.openai.com/usage

# Free tier limits:
# - $5 credit for first 3 months
# - Rate limits apply

# Upgrade to paid plan for higher limits
```

### Error: "Model not found"

```bash
# Check available models at:
# https://platform.openai.com/docs/models

# Update model in code to:
# - gpt-4-turbo-preview (recommended)
# - gpt-4 (stable)
# - gpt-3.5-turbo (cheaper)
```

---

## Migration Checklist

- [ ] Installed OpenAI SDK: `npm install openai@latest`
- [ ] Updated `.env` with `OPENAI_API_KEY`
- [ ] Got API key from https://platform.openai.com/api-keys
- [ ] Removed old `GROQ_API_KEY` from `.env`
- [ ] Ran verification: `npm run verify`
- [ ] Tested video generation
- [ ] Updated Render/Netlify environment variables (if deployed)

---

## Deployment Updates

### For Render Backend:

1. Go to your Render dashboard
2. Select your web service
3. Go to **Environment** tab
4. **Delete**: `GROQ_API_KEY`
5. **Add new variable**:
   ```
   Name: OPENAI_API_KEY
   Value: sk-proj-your_key_here
   ```
6. Click **Save Changes**
7. Service will auto-redeploy

### For Local Development:

Already updated! Just update your `.env` file with the new `OPENAI_API_KEY`.

---

## Next Steps

1. ✅ Generate your first video with OpenAI
2. ✅ Compare script quality with previous Groq-generated scripts
3. ✅ Monitor OpenAI usage dashboard: https://platform.openai.com/usage
4. ✅ Adjust temperature/model settings if needed

---

**Migration complete!** 🎉

Your system now uses **OpenAI GPT-4 Turbo** for all AI text generation.
