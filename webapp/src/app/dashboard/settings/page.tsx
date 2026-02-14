import { Settings as SettingsIcon } from "lucide-react";
import ContentIntelligencePanel from "../../../components/ContentIntelligencePanel";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  const envVars = [
    { key: "GROQ_API_KEY", desc: "Groq AI for script generation (required)", category: "AI" },
    { key: "YOUTUBE_CLIENT_ID", desc: "YouTube OAuth2 client ID", category: "YouTube" },
    { key: "YOUTUBE_CLIENT_SECRET", desc: "YouTube OAuth2 client secret", category: "YouTube" },
    { key: "YOUTUBE_REFRESH_TOKEN", desc: "YouTube OAuth2 refresh token", category: "YouTube" },
    { key: "YOUTUBE_API_KEY", desc: "YouTube Data API key (for trend discovery)", category: "YouTube" },
    { key: "PEXELS_API_KEY", desc: "Pexels API for stock video backgrounds", category: "Media" },
    { key: "PIXABAY_API_KEY", desc: "Pixabay API for background music", category: "Media" },
    { key: "INSTAGRAM_ACCESS_TOKEN", desc: "Instagram Graph API token", category: "Instagram" },
    { key: "INSTAGRAM_BUSINESS_ACCOUNT_ID", desc: "Instagram Business Account ID", category: "Instagram" },
    { key: "REDIS_URL", desc: "Redis connection for BullMQ queues", category: "Infrastructure" },
    { key: "DATABASE_URL", desc: "SQLite database URL", category: "Infrastructure" },
    { key: "NEXTAUTH_SECRET", desc: "NextAuth session secret", category: "Auth" },
    { key: "STRIPE_SECRET_KEY", desc: "Stripe API key (monetization)", category: "Billing" },
    { key: "STRIPE_WEBHOOK_SECRET", desc: "Stripe webhook endpoint secret", category: "Billing" },
  ];

  const categories = [...new Set(envVars.map((v) => v.category))];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Settings</h2>
        <p className="text-zinc-500 text-sm mt-1">Platform configuration & content intelligence</p>
      </div>

      {/* Content Intelligence Panel (client component) */}
      <ContentIntelligencePanel />

      {/* Environment Variables */}
      <div className="pt-4 border-t border-zinc-800">
        <h3 className="text-lg font-semibold mb-4">Environment Variables</h3>
      </div>

      {categories.map((cat) => (
        <div key={cat} className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
          <h3 className="font-semibold mb-4">{cat}</h3>
          <div className="space-y-3">
            {envVars
              .filter((v) => v.category === cat)
              .map((v) => (
                <div key={v.key} className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/50">
                  <div>
                    <code className="text-sm text-violet-400">{v.key}</code>
                    <p className="text-xs text-zinc-500 mt-0.5">{v.desc}</p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded bg-zinc-800 text-zinc-500">
                    {process.env[v.key] ? "✓ Set" : "Not set"}
                  </span>
                </div>
              ))}
          </div>
        </div>
      ))}

      {/* Architecture Info */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <SettingsIcon className="w-4 h-4 text-zinc-400" />
          Architecture
        </h3>
        <div className="grid grid-cols-2 gap-4 text-sm text-zinc-400">
          {[
            { label: "AI Engine", value: "Groq (llama-3.3-70b-versatile)" },
            { label: "TTS", value: "Edge TTS (en-US-ChristopherNeural)" },
            { label: "Transcription", value: "OpenAI Whisper (base model)" },
            { label: "Video Rendering", value: "Remotion 4.0 + ffmpeg" },
            { label: "Queue System", value: "BullMQ + Redis" },
            { label: "Database", value: "SQLite (Prisma 7.x)" },
            { label: "Dashboard", value: "Next.js 14 + Tailwind CSS" },
            { label: "Auth", value: "NextAuth 4 + Prisma adapter" },
          ].map((item) => (
            <div key={item.label} className="flex justify-between p-2">
              <span className="text-zinc-500">{item.label}</span>
              <span>{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
