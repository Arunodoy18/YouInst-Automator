"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Zap, Loader2, CheckCircle, AlertCircle, Clock, RefreshCw, Mic, Globe, Brain, Gauge } from "lucide-react";

const NICHES = [
  { id: "tech", label: "Tech" },
  { id: "ai", label: "AI" },
  { id: "ai-motivation", label: "AI Motivation" },
  { id: "finance-tech", label: "Finance + Tech" },
  { id: "future-tech", label: "Future Tech" },
  { id: "productivity", label: "Productivity" },
  { id: "startup", label: "Startup" },
];

const VOICE_PROFILES = [
  { id: "raju", label: "Raju Rastogi", desc: "Young Hindi male — Hinglish casual (3 Idiots vibe)" },
  { id: "default", label: "Default (English)", desc: "Warm Indian-English male — professional" },
  { id: "madhur", label: "Madhur (Hindi)", desc: "Energetic Hindi male — casual" },
  { id: "swara", label: "Swara (Female)", desc: "Hindi female — authoritative, clear" },
  { id: "neerja", label: "Neerja (English F)", desc: "Indian-English female — warm" },
];

const LANGUAGES = [
  { id: "hinglish", label: "Hinglish", desc: "Hindi + English mix (natural)" },
  { id: "english", label: "English", desc: "Full English" },
  { id: "hindi", label: "Hindi", desc: "Romanized Hindi" },
];

const PSYCHOLOGY_MODES = [
  { id: "aggressive", label: "Aggressive", desc: "Shock, FOMO, urgency" },
  { id: "inspirational", label: "Inspirational", desc: "Empowering, motivational" },
  { id: "educational", label: "Educational", desc: "Value-first, expert" },
  { id: "controversial", label: "Controversial", desc: "Debate, strong stance" },
  { id: "calm", label: "Calm", desc: "Thoughtful, measured" },
];

const RETENTION_LEVELS = [
  { id: "basic", label: "Basic", desc: "Steady pacing, clear" },
  { id: "enhanced", label: "Enhanced", desc: "Pattern interrupts, tension" },
  { id: "viral", label: "Viral", desc: "Max dopamine, fast pacing" },
];

const PIPELINE_STEPS = [
  "1. Performance feedback + AI analysis",
  "2. Load intelligence config",
  "3. Intelligent niche rotation",
  "4. Trend scan — discover viral keywords",
  "5. Generate & score trending topics",
  "6. Fact-based research — verify data",
  "7. Generate fact-verified content",
  "8. Render video (TTS + captions + bg + music)",
  "9. Upload to platforms (YouTube + Instagram)",
  "10. Score retention (6-dimension AI eval)",
  "11. Track analytics",
  "12. Feed performance back into system",
  "13. Log results + retention report",
];

interface JobStatus {
  id: string;
  status: string;
  elapsedFormatted: string;
  elapsedMs: number;
  result: any;
  errorLog: string | null;
  payload: any;
}

export default function GeneratePage() {
  const [niche, setNiche] = useState("ai");
  const [topic, setTopic] = useState("");
  const [voiceProfile, setVoiceProfile] = useState("raju");
  const [language, setLanguage] = useState("hinglish");
  const [psychologyMode, setPsychologyMode] = useState("aggressive");
  const [retentionLevel, setRetentionLevel] = useState("enhanced");
  const [status, setStatus] = useState<"idle" | "running" | "success" | "error">("idle");
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [mode, setMode] = useState<string>("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Poll job status
  const pollJob = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/jobs/${id}`);
      if (!res.ok) return;
      const data: JobStatus = await res.json();
      setJobStatus(data);

      if (data.status === "completed") {
        setStatus("success");
        setResult(data.result);
        if (pollRef.current) clearInterval(pollRef.current);
      } else if (data.status === "failed") {
        setStatus("error");
        setError(data.errorLog || "Pipeline failed");
        if (pollRef.current) clearInterval(pollRef.current);
      }
    } catch {
      // Ignore poll errors
    }
  }, []);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const handleGenerate = async () => {
    setStatus("running");
    setError("");
    setResult(null);
    setJobId(null);
    setJobStatus(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nicheId: niche,
          topic: topic.trim() || undefined,
          voiceProfileId: voiceProfile,
          language,
          psychologyMode,
          retentionLevel,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Generation failed");
      }

      setJobId(data.jobId);
      setMode(data.mode || "direct");

      // Start polling every 3 seconds
      if (data.jobId) {
        pollRef.current = setInterval(() => pollJob(data.jobId), 3000);
        // Initial poll
        pollJob(data.jobId);
      }
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
          Trigger the full 13-step AI pipeline: Research → Script → TTS → Render → Upload
        </p>
      </div>

      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 max-w-3xl">
        {/* Niche Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Select Niche</label>
          <div className="grid grid-cols-4 gap-2">
            {NICHES.map((n) => (
              <button
                key={n.id}
                onClick={() => setNiche(n.id)}
                disabled={status === "running"}
                className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                  niche === n.id
                    ? "bg-violet-600 text-white"
                    : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                } disabled:opacity-50`}
              >
                {n.label}
              </button>
            ))}
          </div>
        </div>

        {/* Voice Profile */}
        <div className="mb-6">
          <label className="flex items-center gap-2 text-sm font-medium mb-2">
            <Mic className="w-4 h-4 text-cyan-400" /> Voice Profile
          </label>
          <div className="grid grid-cols-3 gap-2">
            {VOICE_PROFILES.map((v) => (
              <button
                key={v.id}
                onClick={() => {
                  setVoiceProfile(v.id);
                  // Auto-set language from voice
                  if (v.id === "raju" || v.id === "swara") setLanguage("hinglish");
                  else if (v.id === "madhur") setLanguage("hindi");
                  else setLanguage("english");
                }}
                disabled={status === "running"}
                className={`px-3 py-2 rounded-lg text-left transition-colors ${
                  voiceProfile === v.id
                    ? "bg-cyan-600/30 border border-cyan-500 text-cyan-300"
                    : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 border border-transparent"
                } disabled:opacity-50`}
              >
                <div className="text-sm font-medium">{v.label}</div>
                <div className="text-xs text-zinc-500 mt-0.5">{v.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Language + Psychology + Retention — 3 column row */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {/* Language */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium mb-2">
              <Globe className="w-4 h-4 text-green-400" /> Language
            </label>
            <div className="space-y-1.5">
              {LANGUAGES.map((l) => (
                <button
                  key={l.id}
                  onClick={() => setLanguage(l.id)}
                  disabled={status === "running"}
                  className={`w-full px-3 py-2 rounded-lg text-left text-sm transition-colors ${
                    language === l.id
                      ? "bg-green-600/30 border border-green-500 text-green-300"
                      : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 border border-transparent"
                  } disabled:opacity-50`}
                >
                  <span className="font-medium">{l.label}</span>
                  <span className="text-xs text-zinc-500 ml-1">— {l.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Psychology Mode */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium mb-2">
              <Brain className="w-4 h-4 text-purple-400" /> Psychology
            </label>
            <div className="space-y-1.5">
              {PSYCHOLOGY_MODES.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setPsychologyMode(m.id)}
                  disabled={status === "running"}
                  className={`w-full px-3 py-2 rounded-lg text-left text-sm transition-colors ${
                    psychologyMode === m.id
                      ? "bg-purple-600/30 border border-purple-500 text-purple-300"
                      : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 border border-transparent"
                  } disabled:opacity-50`}
                >
                  <span className="font-medium">{m.label}</span>
                  <span className="text-xs text-zinc-500 ml-1">— {m.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Retention Level */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium mb-2">
              <Gauge className="w-4 h-4 text-orange-400" /> Retention
            </label>
            <div className="space-y-1.5">
              {RETENTION_LEVELS.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setRetentionLevel(r.id)}
                  disabled={status === "running"}
                  className={`w-full px-3 py-2 rounded-lg text-left text-sm transition-colors ${
                    retentionLevel === r.id
                      ? "bg-orange-600/30 border border-orange-500 text-orange-300"
                      : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 border border-transparent"
                  } disabled:opacity-50`}
                >
                  <span className="font-medium">{r.label}</span>
                  <span className="text-xs text-zinc-500 ml-1">— {r.desc}</span>
                </button>
              ))}
            </div>
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
            disabled={status === "running"}
            placeholder="e.g. 5 AI tools that replaced a $100K salary"
            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-sm focus:outline-none focus:border-violet-500 placeholder:text-zinc-600 disabled:opacity-50"
          />
        </div>

        {/* Config Summary */}
        <div className="mb-4 p-3 bg-zinc-800/50 rounded-lg border border-zinc-800 text-xs text-zinc-400">
          <span className="text-zinc-300 font-medium">Config:</span>{" "}
          {NICHES.find(n => n.id === niche)?.label} niche ·{" "}
          {VOICE_PROFILES.find(v => v.id === voiceProfile)?.label} voice ·{" "}
          {LANGUAGES.find(l => l.id === language)?.label} ·{" "}
          {PSYCHOLOGY_MODES.find(m => m.id === psychologyMode)?.label} mode ·{" "}
          {RETENTION_LEVELS.find(r => r.id === retentionLevel)?.label} retention ·{" "}
          30-40s duration
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
              Pipeline Running{jobStatus ? ` (${jobStatus.elapsedFormatted})` : "…"}
            </>
          ) : (
            <>
              <Zap className="w-5 h-5" />
              Generate & Upload Video
            </>
          )}
        </button>

        {/* Live Status */}
        {status === "running" && jobId && (
          <div className="mt-4 p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
            <div className="flex items-center gap-2 mb-2">
              <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin" />
              <span className="text-sm text-cyan-400 font-medium">
                {mode === "queued" ? "Queued (BullMQ)" : "Running (Direct)"}
              </span>
              {jobStatus && (
                <span className="text-xs text-zinc-500 ml-auto">
                  <Clock className="w-3 h-3 inline mr-1" />
                  {jobStatus.elapsedFormatted}
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-500">
              Job ID: {jobId.substring(0, 12)}… — Polling every 3s
            </p>
          </div>
        )}
      </div>

      {/* Success Result */}
      {status === "success" && result && (
        <div className="bg-green-900/20 border border-green-800 rounded-xl p-6 max-w-3xl">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <h3 className="font-semibold text-green-400">Video Generated Successfully!</h3>
            {jobStatus && (
              <span className="text-xs text-green-600 ml-auto">{jobStatus.elapsedFormatted}</span>
            )}
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
            {(!result.uploads || result.uploads.length === 0) && (
              <p className="text-zinc-500">No upload URLs in result — check logs for details</p>
            )}
          </div>
        </div>
      )}

      {/* Error */}
      {status === "error" && (
        <div className="bg-red-900/20 border border-red-800 rounded-xl p-6 max-w-3xl">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <h3 className="font-semibold text-red-400">Pipeline Failed</h3>
          </div>
          <p className="text-sm text-red-300">{error}</p>
          <button
            onClick={() => { setStatus("idle"); setError(""); setJobId(null); setJobStatus(null); }}
            className="mt-3 text-xs text-zinc-400 hover:text-zinc-200 underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Pipeline Steps */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 max-w-3xl">
        <h3 className="font-semibold mb-3">13-Step Autonomous Pipeline</h3>
        <div className="space-y-2 text-sm text-zinc-400">
          {PIPELINE_STEPS.map((step) => (
            <p key={step} className="pl-2 border-l-2 border-zinc-800">{step}</p>
          ))}
        </div>
      </div>
    </div>
  );
}
