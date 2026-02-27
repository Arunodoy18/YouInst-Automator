import { Settings as SettingsIcon } from "lucide-react";
import ContentIntelligencePanel from "../../../components/ContentIntelligencePanel";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  const envVars = [
    { key: "GROQ_API_KEY", desc: "Groq AI for script generation (required)", category: "AI" },
    { key: "ELEVENLABS_API_KEY", desc: "ElevenLabs premium TTS (optional, Edge TTS fallback)", category: "AI" },
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
            { label: "TTS", value: "Edge TTS (Bollywood cinema profiles)" },
            { label: "Transcription", value: "OpenAI Whisper (base model)" },
            { label: "Video Quality", value: "Cinema HD (CRF 18, slow preset)" },
            { label: "Video Rendering", value: "Remotion 4.0 + ffmpeg" },
            { label: "Motion Graphics", value: "6 custom futuristic presets" },
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

      {/* Cinema Quality Voice Profiles */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
        <h3 className="font-semibold mb-3">🎬 Cinema-Quality Voice Profiles</h3>
        <div className="space-y-3 text-sm">
          {[
            { name: "Raju (Hindi)", voice: "hi-IN-MadhurNeural", style: "+8% rate, +3Hz pitch", desc: "Energetic youth — pure Hindi, 3 Idiots cinema vibe" },
            { name: "Raju (English)", voice: "en-IN-PrabhatNeural", style: "+8% rate, +3Hz pitch", desc: "Energetic youth — pure English with authentic Indian accent" },
            { name: "Salman Khan (Hindi)", voice: "hi-IN-MadhurNeural", style: "+0% rate, -4Hz pitch", desc: "Deep authoritative — pure Hindi, Dabangg style" },
            { name: "Salman Khan (English)", voice: "en-IN-PrabhatNeural", style: "+2% rate, -2Hz pitch", desc: "Deep authoritative — pure English, Bollywood legend" },
          ].map((v) => (
            <div key={v.name} className="p-3 rounded-lg bg-zinc-800/50 flex justify-between items-start">
              <div>
                <p className="text-zinc-200 font-medium">{v.name}</p>
                <p className="text-zinc-500 text-xs mt-0.5">{v.desc}</p>
              </div>
              <div className="text-right">
                <code className="text-xs text-cyan-400">{v.voice}</code>
                <p className="text-xs text-zinc-600 mt-0.5">{v.style}</p>
              </div>
            </div>
          ))}
          <p className="text-xs text-zinc-600 mt-2">
            ⚠️ Language purity enforced — Hindi voices use 100% Hindi, English voices use 100% English. No mixing.
          </p>
        </div>
      </div>

      {/* Motion Graphics Presets */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
        <h3 className="font-semibold mb-3">🚀 Motion Graphics Presets</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          {[
            { name: "Ultra Futuristic", desc: "High-speed zoom, intense glitch, chromatic aberration" },
            { name: "Matrix Code", desc: "Digital rain overlay, green monochrome aesthetics" },
            { name: "Neon Cyberpunk", desc: "RGB split, neon glow, fast pan movement" },
            { name: "Hologram", desc: "Scan lines, flickering, transparency effects" },
            { name: "Digital Chaos", desc: "Strobe lighting, data mosaic, color shift" },
            { name: "Tron Grid", desc: "Electric blue grid, slow zoom, clean lines" },
          ].map((p) => (
            <div key={p.name} className="p-3 rounded-lg bg-zinc-800/50">
              <p className="text-zinc-200 font-medium">{p.name}</p>
              <p className="text-zinc-500 text-xs mt-0.5">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
