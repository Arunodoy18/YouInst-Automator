# 🚦 Pre-Deploy Checklist

Use this before pushing to production.

## ✅ Code Quality

- [ ] `npm run build` succeeds in webapp/ with no errors
- [ ] `npx tsc --noEmit` passes with no type errors
- [ ] All environment variables documented in `.env.example`
- [ ] No hardcoded secrets in code (check with `git grep -i "gsk_\|sk_test"`)

## ✅ Security

- [ ] `.env` is in `.gitignore` (never commit secrets!)
- [ ] `NEXTAUTH_SECRET` is a strong random string (64+ chars)
- [ ] Database is NOT committed (check `prisma/*.db` in `.gitignore`)
- [ ] No API keys in client-side code

## ✅ Configuration

- [ ] `render.yaml` has correct service name and region
- [ ] `NEXTAUTH_URL` matches your production domain
- [ ] Dockerfile.webapp builds successfully (`docker build -f Dockerfile.webapp -t test .`)
- [ ] Health check endpoint works (`/api/health`)

## ✅ Database

- [ ] Prisma schema is up to date (`npx prisma generate`)
- [ ] No pending migrations (or run `npx prisma migrate deploy` on first deploy)
- [ ] SQLite path is correct for production (`file:/app/data/youinst.db`)

## ✅ Dependencies

- [ ] All dependencies installed (`npm install && cd webapp && npm install`)
- [ ] No critical vulnerabilities (`npm audit`)
- [ ] Python dependencies documented (edge-tts, openai-whisper)

## ✅ Testing

- [ ] Local dev server runs (`npm run webapp`)
- [ ] Registration works (`/register`)
- [ ] Login works (`/login`)
- [ ] Dashboard loads (`/dashboard`)
- [ ] Pipeline generates a video (`/dashboard/generate`)

## ✅ Deployment Platform

### Render Specific
- [ ] GitHub repo is public or Render has access
- [ ] All environment variables set in Render dashboard
- [ ] Disk mounted at `/app/data` (1-5 GB)
- [ ] Health check path set to `/api/health`
- [ ] Auto-deploy enabled on `main` branch

## ✅ Post-Deploy

After first deploy:
- [ ] Visit `/api/health` → should return `{"status":"healthy"}`
- [ ] Register first user
- [ ] Generate test video
- [ ] Check Render logs for errors

## 🚨 Common Issues

| Issue | Solution |
|-------|----------|
| "Module not found" | Run `npm install` in both root and webapp/ |
| "GROQ_API_KEY is not defined" | Add to Render environment variables |
| "Cannot find module .prisma/client" | Run `npx prisma generate` |
| "SQLite is locked" | Only 1 instance should write to DB |
| "Unauthorized" on dashboard | Check NEXTAUTH_URL matches deployed URL |

## 📝 Quick Deploy Commands

```bash
# 1. Commit all changes
git add -A
git commit -m "production ready"

# 2. Push to GitHub
git push origin main

# 3. Render auto-deploys (if Blueprint connected)
# Or manually: Render Dashboard → Deploy Latest Commit
```

---

**Ready?** → [Deploy to Render](https://render.com/deploy) 🚀
