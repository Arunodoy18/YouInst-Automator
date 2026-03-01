"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Zap, Loader2, CheckCircle, AlertCircle, Clock, RefreshCw, Mic, Globe, Brain, Gauge, Film, Sparkles } from "lucide-react";

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
  { id: "raju_hindi", label: "🎬 Raju (Hindi)", desc: "Cinema-quality — Pure Hindi, energetic youth", category: "bollywood" },
  { id: "raju_english", label: "🎬 Raju (English)", desc: "Cinema-quality — Pure English, energetic youth", category: "bollywood" },
  { id: "salman_hindi", label: "🎬 Salman Khan (Hindi)", desc: "Cinema-quality — Pure Hindi, authoritative", category: "bollywood" },
  { id: "salman_english", label: "🎬 Salman Khan (English)", desc: "Cinema-quality — Pure English, authoritative", category: "bollywood" },
  { id: "raju", label: "Raju Rastogi", desc: "Young Hindi male — Hinglish casual (3 Idiots vibe)", category: "standard" },
  { id: "default", label: "Default (English)", desc: "Warm Indian-English male — professional", category: "standard" },
  { id: "madhur", label: "Madhur (Hindi)", desc: "Energetic Hindi male — casual", category: "standard" },
  { id: "swara", label: "Swara (Female)", desc: "Hindi female — authoritative, clear", category: "standard" },
  { id: "neerja", label: "Neerja (English F)", desc: "Indian-English female — warm", category: "standard" },
];

const LANGUAGES = [
  { id: "hindi", label: "Pure Hindi", desc: "100% Hindi — cinema authentic" },
  { id: "english", label: "Pure English", desc: "100% English — cinema authentic" },
  { id: "hinglish", label: "Hinglish", desc: "Hindi + English mix (natural)" },
];

const VISUAL_PRESETS = [
  { id: "ultra_futuristic", label: "Ultra Futuristic", desc: "High-speed zoom, intense glitch, chromatic", icon: "🚀" },
  { id: "matrix", label: "Matrix Code", desc: "Digital rain, green monochrome", icon: "💻" },
  { id: "neon_cyberpunk", label: "Neon Cyberpunk", desc: "RGB split, neon glow, fast pan", icon: "🌃" },
  { id: "hologram", label: "Hologram", desc: "Scan lines, flickering, transparency", icon: "👁️" },
  { id: "digital_chaos", label: "Digital Chaos", desc: "Strobe, data mosaic, color shift", icon: "⚡" },
  { id: "tron", label: "Tron Grid", desc: "Electric blue grid, slow zoom", icon: "🎮" },
  { id: "auto", label: "Auto (Smart Select)", desc: "AI picks best for your content", icon: "🎯" },
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
  const [voiceProfile, setVoiceProfile] = useState("raju_hindi");
  const [language, setLanguage] = useState("hindi");
  const [visualPreset, setVisualPreset] = useState("auto");
  const [hdQuality, setHdQuality] = useState(true);
  const [psychologyMode, setPsychologyMode] = useState("aggressive");
  const [retentionLevel, setRetentionLevel] = useState("enhanced");
  const [status, setStatus] = useState<"idle" | "running" | "success" | "error">("idle");
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [mode, setMode] = useState<string>("");
  const [clonedVoices, setClonedVoices] = useState<typeof VOICE_PROFILES>([]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch cloned voices on mount
  useEffect(() => {
    fetch("/api/voices")
      .then((res) => res.json())
      .then((data) => {
        if (data.clonedVoices?.length > 0) {
          setClonedVoices(data.clonedVoices);
        }
      })
      .catch(() => {}); // Ignore errors
  }, []);

  // Merge built-in + cloned voices
  const allVoices = [...VOICE_PROFILES, ...clonedVoices];

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
          visualPreset: visualPreset === "auto" ? undefined : visualPreset,
          hdQuality,
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
          
          {/* Cinema-Quality Bollywood Voices */}
          <div className="mb-3">
            <p className="text-xs text-cyan-400 font-semibold mb-2">🎬 CINEMA-QUALITY BOLLYWOOD</p>
            <div className="grid grid-cols-2 gap-2">
              {VOICE_PROFILES.filter(v => v.category === "bollywood").map((v) => (
                <button
                  key={v.id}
                  onClick={() => {
                    setVoiceProfile(v.id);
                    // Auto-set pure language from cinema voice
                    if (v.id.includes("_hindi")) setLanguage("hindi");
                    else if (v.id.includes("_english")) setLanguage("english");
                  }}
                  disabled={status === "running"}
                  className={`px-3 py-2 rounded-lg text-left transition-colors ${
                    voiceProfile === v.id
                      ? "bg-gradient-to-r from-cyan-600/30 to-violet-600/30 border border-cyan-500 text-cyan-300"
                      : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 border border-transparent"
                  } disabled:opacity-50`}
                >
                  <div className="text-sm font-medium">{v.label}</div>
                  <div className="text-xs text-zinc-500 mt-0.5">{v.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Standard Voices */}
          <div>
            <p className="text-xs text-zinc-500 font-semibold mb-2">STANDARD VOICES</p>
            <div className="grid grid-cols-3 gap-2">
              {allVoices.filter(v => v.category === "standard").map((v) => (
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

          {/* Cloned Voices — only shown when cloned voices exist */}
          {clonedVoices.length > 0 && (
            <div className="mt-3">
              <p className="text-xs text-emerald-400 font-semibold mb-2">🎤 YOUR CLONED VOICES</p>
              <div className="grid grid-cols-2 gap-2">
                {clonedVoices.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => {
                      setVoiceProfile(v.id);
                      if ((v as any).language) setLanguage((v as any).language);
                    }}
                    disabled={status === "running"}
                    className={`px-3 py-2 rounded-lg text-left transition-colors ${
                      voiceProfile === v.id
                        ? "bg-gradient-to-r from-emerald-600/30 to-cyan-600/30 border border-emerald-500 text-emerald-300"
                        : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 border border-transparent"
                    } disabled:opacity-50`}
                  >
                    <div className="text-sm font-medium">{v.label}</div>
                    <div className="text-xs text-zinc-500 mt-0.5">{v.desc}</div>
                    {(v as any).hasElevenLabs && (
                      <span className="text-[10px] text-emerald-500 mt-1 inline-block">ElevenLabs Clone</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Visual Preset + HD Quality — 2 column row */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Visual Preset */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium mb-2">
              <Film className="w-4 h-4 text-violet-400" /> Motion Graphics
            </label>
            <div className="space-y-1.5">
              {VISUAL_PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setVisualPreset(p.id)}
                  disabled={status === "running"}
                  className={`w-full px-3 py-2 rounded-lg text-left text-sm transition-colors ${
                    visualPreset === p.id
                      ? "bg-violet-600/30 border border-violet-500 text-violet-300"
                      : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 border border-transparent"
                  } disabled:opacity-50`}
                >
                  <span className="mr-1.5">{p.icon}</span>
                  <span className="font-medium">{p.label}</span>
                  <span className="text-xs text-zinc-500 ml-1">— {p.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* HD Quality + Info */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium mb-2">
              <Sparkles className="w-4 h-4 text-yellow-400" /> Quality Settings
            </label>
            <div className="space-y-3">
              {/* HD Toggle */}
              <div className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-zinc-200">Cinema HD Quality</span>
                  <button
                    onClick={() => setHdQuality(!hdQuality)}
                    disabled={status === "running"}
                    title={hdQuality ? "Switch to fast quality" : "Switch to cinema HD quality"}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${
                      hdQuality ? "bg-violet-600" : "bg-zinc-700"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        hdQuality ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
                <p className="text-xs text-zinc-500">
                  {hdQuality 
                    ? "✅ CRF 18, slow preset, 12M bitrate — cinema quality" 
                    : "⚡ CRF 28, fast preset — quicker render"}
                </p>
              </div>

              {/* Quality Info */}
              <div className="p-3 rounded-lg bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-500 space-y-1">
                <p><strong className="text-zinc-400">Smooth Motion:</strong> Reduced pan, slower periods, light grain</p>
                <p><strong className="text-zinc-400">Resolution:</strong> 1080×1920 (9:16 vertical)</p>
                <p><strong className="text-zinc-400">Duration:</strong> 30-40 seconds optimized</p>
              </div>
            </div>
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
          {VISUAL_PRESETS.find(p => p.id === visualPreset)?.label} graphics ·{" "}
          {hdQuality ? "Cinema HD" : "Fast"} quality ·{" "}
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
