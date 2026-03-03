# Netlify Static Export Setup

## Quick Deploy Instructions

### Option 1: Automatic GitHub Integration (Recommended)

1. **Push code to GitHub**
   ```bash
   git add .
   git commit -m "Add Netlify configuration"
   git push origin main
   ```

2. **Connect to Netlify**
   - Go to https://app.netlify.com
   - Click "New site from Git"
   - Choose your GitHub repository
   - Configure build settings:
     ```
     Base directory: webapp
     Build command: npm run build
     Publish directory: out
     ```

3. **Add environment variable**
   ```
   NEXT_PUBLIC_API_URL = https://yourinst-api.onrender.com
   ```

4. **Deploy!**

### Option 2: Netlify CLI

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Initialize site
cd webapp
netlify init

# Deploy
netlify deploy --prod
```

---

## Configuration Files

### 1. Switch to Static Export Config

```bash
cd webapp

# Backup server config
mv next.config.js next.config.server.js

# Use static export config
mv next.config.netlify.js next.config.js
```

### 2. Update package.json Build Script

Edit `webapp/package.json`:

```json
{
  "scripts": {
    "build": "next build",
    "export": "next build && next export"
  }
}
```

### 3. Verify Build

```bash
cd webapp
npm run build

# Check output folder
ls out/
```

---

## Important Notes

### ❌ What Doesn't Work in Static Export

1. **API Routes** - No `/pages/api/*` routes
   - Solution: All API calls go to Render backend
   - Already configured in netlify.toml

2. **Server-Side Rendering (SSR)** - No `getServerSideProps`
   - Solution: Use `getStaticProps` or client-side fetching

3. **Image Optimization** - Next.js Image component features limited
   - Solution: `images.unoptimized = true` in config

4. **Rewrites/Redirects** - Must use netlify.toml
   - Already configured in root netlify.toml

### ✅ What Works

1. **Client-side rendering**
2. **Static site generation (SSG)**
3. **Client-side routing**
4. **API calls to Render backend**
5. **All React components**
6. **Tailwind CSS**

---

## Folder Structure

```
webapp/
├── next.config.js              # Active config (for Netlify)
├── next.config.server.js       # Server config (backup)
├── next.config.netlify.js      # Static export config (original)
├── pages/                      # Next.js pages
│   ├── index.tsx              # Homepage
│   └── dashboard.tsx          # Dashboard
├── components/                 # React components
└── out/                       # Build output (deploy this to Netlify)
```

---

## API Integration

All API calls should use the environment variable:

```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:10000';

// Example API call
async function generateVideo(data) {
  const response = await fetch(`${API_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return response.json();
}
```

---

## Testing Locally

```bash
# Build static site
cd webapp
npm run build

# Serve locally
npx serve out

# Or use Netlify CLI
netlify dev
```

---

## Deployment Checklist

- [ ] Backed up server config (`next.config.server.js`)
- [ ] Using static export config
- [ ] Set `NEXT_PUBLIC_API_URL` in Netlify dashboard
- [ ] Verified build succeeds (`npm run build`)
- [ ] Tested locally with `npx serve out`
- [ ] Pushed to GitHub
- [ ] Connected to Netlify
- [ ] Deployed successfully

---

## Troubleshooting

### Build fails with "API routes not supported"
- Remove or move any files in `pages/api/`
- Use Render backend for all API logic

### Images not loading
- Check `images.unoptimized = true` in config
- Use standard `<img>` tags instead of `<Image>`

### API calls failing
- Verify `NEXT_PUBLIC_API_URL` is set correctly
- Check CORS settings in backend server
- Verify Render backend is running

### 404 errors on page refresh
- Check `trailingSlash: true` in config
- Verify netlify.toml has SPA fallback redirect

---

## Need Help?

- **Netlify Docs:** https://docs.netlify.com
- **Next.js Static Export:** https://nextjs.org/docs/pages/building-your-application/deploying/static-exports
- **Netlify Community:** https://answers.netlify.com
