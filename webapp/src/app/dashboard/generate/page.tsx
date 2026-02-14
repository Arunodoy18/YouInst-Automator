"use client";

import { useState } from "react";
import { Zap, Loader2, CheckCircle, AlertCircle } from "lucide-react";

const NICHES = [
  { id: "tech", label: "Tech" },
  { id: "ai", label: "AI" },
  { id: "ai-motivation", label: "AI Motivation" },
  { id: "finance-tech", label: "Finance + Tech" },
  { id: "future-tech", label: "Future Tech" },
  { id: "productivity", label: "Productivity" },
  { id: "startup", label: "Startup" },
];

export default function GeneratePage() {
  const [niche, setNiche] = useState("ai");
  const [topic, setTopic] = useState("");
  const [status, setStatus] = useState<"idle" | "running" | "success" | "error">("idle");
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  const handleGenerate = async () => {
    setStatus("running");
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nicheId: niche,
          topic: topic.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Generation failed");
      }

      setResult(data);
      setStatus("success");
    } catch (err: any) {
      setError(err.message);
      setStatus("error");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Generate Video</h2>
        <p className="text-zinc-500 text-sm mt-1">
          Trigger the full AI pipeline: Script → TTS → Render → Upload
        </p>
      </div>

      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 max-w-2xl">
        {/* Niche Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Select Niche</label>
          <div className="grid grid-cols-4 gap-2">
            {NICHES.map((n) => (
              <button
                key={n.id}
                onClick={() => setNiche(n.id)}
                className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                  niche === n.id
                    ? "bg-violet-600 text-white"
                    : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                }`}
              >
                {n.label}
              </button>
            ))}
          </div>
        </div>

        {/* Topic Override */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">
            Topic <span className="text-zinc-500 font-normal">(optional — AI will pick one if empty)</span>
          </label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. 5 AI tools that replaced a $100K salary"
            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-sm focus:outline-none focus:border-violet-500 placeholder:text-zinc-600"
          />
        </div>

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={status === "running"}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-semibold transition-all"
        >
          {status === "running" ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Generating… (this takes 2-5 minutes)
            </>
          ) : (
            <>
              <Zap className="w-5 h-5" />
              Generate & Upload Video
            </>
          )}
        </button>
      </div>

      {/* Result */}
      {status === "success" && result && (
        <div className="bg-green-900/20 border border-green-800 rounded-xl p-6 max-w-2xl">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <h3 className="font-semibold text-green-400">Video Generated Successfully!</h3>
          </div>
          <div className="space-y-2 text-sm">
            <p><span className="text-zinc-500">Topic:</span> {result.topic}</p>
            <p><span className="text-zinc-500">Niche:</span> {result.nicheId}</p>
            {result.uploads?.map((u: any, i: number) => (
              <p key={i}>
                <span className="text-zinc-500">{u.platform}:</span>{" "}
                <a href={u.url} target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:underline">
                  {u.url}
                </a>
              </p>
            ))}
          </div>
        </div>
      )}

      {status === "error" && (
        <div className="bg-red-900/20 border border-red-800 rounded-xl p-6 max-w-2xl">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <p className="text-red-400">{error}</p>
          </div>
        </div>
      )}

      {/* Pipeline Steps */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 max-w-2xl">
        <h3 className="font-semibold mb-3">Pipeline Steps</h3>
        <div className="space-y-2 text-sm text-zinc-400">
          {[
            "1. Trend scan — discover viral keywords",
            "2. Agent Brain — generate topic + script with psychological triggers",
            "3. Hook optimization — ensure scroll-stopping power",
            "4. Edge TTS — generate professional voice-over",
            "5. Whisper — extract word-level timestamps",
            "6. Background music + stock video",
            "7. Remotion — render vertical 1080×1920 video",
            "8. Platform optimization — YouTube & Instagram SEO",
            "9. Upload to all configured platforms",
            "10. Enqueue analytics tracking (auto-fetch after 1hr)",
          ].map((step) => (
            <p key={step} className="pl-2 border-l-2 border-zinc-800">{step}</p>
          ))}
        </div>
      </div>
    </div>
  );
}
