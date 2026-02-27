import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="max-w-2xl text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-6xl font-extrabold bg-gradient-to-r from-violet-400 via-cyan-400 to-violet-400 bg-clip-text text-transparent">
            YouInst AI
          </h1>
          <p className="text-xl text-zinc-400">
            Fully Automated AI Content Studio for YouTube Shorts & Instagram Reels
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 text-sm">
          {[
            { label: "AI Scripts", desc: "Groq LLM-powered" },
            { label: "Cinema HD", desc: "CRF 18 + smooth motion" },
            { label: "Bollywood Voices", desc: "Raju & Salman cinema TTS" },
            { label: "Motion Graphics", desc: "6 futuristic presets" },
            { label: "Multi-Platform", desc: "YouTube + Instagram" },
            { label: "Self-Learning", desc: "Analytics feedback" },
          ].map((f) => (
            <div
              key={f.label}
              className="p-4 bg-zinc-900 rounded-xl border border-zinc-800"
            >
              <p className="font-semibold text-zinc-200">{f.label}</p>
              <p className="text-zinc-500 text-xs mt-1">{f.desc}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-4 justify-center">
          <Link
            href="/login"
            className="px-6 py-3 bg-violet-600 hover:bg-violet-500 rounded-lg font-semibold transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg font-semibold transition-colors"
          >
            Create Account
          </Link>
        </div>

        <p className="text-zinc-600 text-xs">
          7 niches · Cinema-quality Bollywood voices · 6 motion graphic presets · HD rendering · Dual-platform SEO
        </p>
      </div>
    </div>
  );
}
