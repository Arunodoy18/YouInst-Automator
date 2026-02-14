"use client";

import { useState, useEffect, useCallback } from "react";
import { Brain, Zap, RotateCcw, Loader2, Check, ChevronDown } from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────

type PsychologyMode = "aggressive" | "inspirational" | "educational" | "controversial" | "calm";
type RetentionLevel = "basic" | "enhanced" | "viral";

interface IntelligenceConfig {
  psychologyMode: PsychologyMode;
  retentionLevel: RetentionLevel;
  nicheRotationEnabled: boolean;
}

interface RotationEntry {
  nicheId: string;
  usageCount: number;
  lastUsed: string;
  avgViews: number;
}

// ── Psychology Mode Config ───────────────────────────────────────────

const PSYCHOLOGY_MODES: { value: PsychologyMode; label: string; desc: string; color: string }[] = [
  {
    value: "aggressive",
    label: "Aggressive",
    desc: "Shock + Fear hooks. Bold claims. Confrontational.",
    color: "text-red-400",
  },
  {
    value: "inspirational",
    label: "Inspirational",
    desc: "Motivation + Authority. Empowering vision.",
    color: "text-amber-400",
  },
  {
    value: "educational",
    label: "Educational",
    desc: "Value-first. Teach immediately. Expert authority.",
    color: "text-blue-400",
  },
  {
    value: "controversial",
    label: "Controversial",
    desc: "Challenge mainstream. Provoke debate. Polarize.",
    color: "text-orange-400",
  },
  {
    value: "calm",
    label: "Calm + Insightful",
    desc: "Thoughtful. Curiosity-driven. Measured delivery.",
    color: "text-emerald-400",
  },
];

// ── Retention Levels ─────────────────────────────────────────────────

const RETENTION_LEVELS: { value: RetentionLevel; label: string; desc: string; intensity: number }[] = [
  {
    value: "basic",
    label: "Basic",
    desc: "Steady pacing, clear structure",
    intensity: 1,
  },
  {
    value: "enhanced",
    label: "Enhanced",
    desc: "Pattern interrupts, emotional hooks, tension build",
    intensity: 2,
  },
  {
    value: "viral",
    label: "Viral Mode",
    desc: "Fast pacing, open-loops, max dopamine triggers",
    intensity: 3,
  },
];

// ── Agent Flow Steps ─────────────────────────────────────────────────

const AGENT_FLOW_STEPS = [
  { step: 1, label: "Fetch performance data", icon: "📊" },
  { step: 2, label: "Load intelligence config", icon: "🧠" },
  { step: 3, label: "Rotate niche intelligently", icon: "🔄" },
  { step: 4, label: "Trend scan keywords", icon: "📈" },
  { step: 5, label: "Generate trending topic", icon: "💡" },
  { step: 6, label: "Generate 5 hooks → select best", icon: "🎣" },
  { step: 7, label: "Generate retention script", icon: "📝" },
  { step: 8, label: "Render video (TTS + captions)", icon: "🎬" },
  { step: 9, label: "Upload to platforms", icon: "🚀" },
  { step: 10, label: "Track analytics", icon: "📉" },
  { step: 11, label: "Feed performance back", icon: "♻️" },
];

// ── Component ────────────────────────────────────────────────────────

export default function ContentIntelligencePanel() {
  const [config, setConfig] = useState<IntelligenceConfig>({
    psychologyMode: "aggressive",
    retentionLevel: "enhanced",
    nicheRotationEnabled: false,
  });
  const [rotationSummary, setRotationSummary] = useState<RotationEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [modeOpen, setModeOpen] = useState(false);

  // Load config on mount
  useEffect(() => {
    fetch("/api/intelligence")
      .then((r) => r.json())
      .then((data) => {
        if (data.config) setConfig(data.config);
        if (data.rotationSummary) setRotationSummary(data.rotationSummary);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Save config
  const saveConfig = useCallback(async (newConfig: IntelligenceConfig) => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/intelligence", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newConfig),
      });
      const data = await res.json();
      if (data.config) setConfig(data.config);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error("Failed to save:", err);
    } finally {
      setSaving(false);
    }
  }, []);

  const updateField = <K extends keyof IntelligenceConfig>(key: K, value: IntelligenceConfig[K]) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
    saveConfig(newConfig);
  };

  const selectedMode = PSYCHOLOGY_MODES.find((m) => m.value === config.psychologyMode)!;
  const selectedRetention = RETENTION_LEVELS.find((r) => r.value === config.retentionLevel)!;

  if (loading) {
    return (
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
        <div className="flex items-center gap-2 text-zinc-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading intelligence settings…
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-900/40 to-fuchsia-900/40 rounded-xl border border-violet-700/50 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-violet-600/30 flex items-center justify-center">
              <Brain className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Content Intelligence Settings</h3>
              <p className="text-sm text-zinc-400">Configure how the AI agent generates content</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            {saving && <Loader2 className="w-3 h-3 animate-spin text-violet-400" />}
            {saved && <Check className="w-3 h-3 text-green-400" />}
            <span className="text-zinc-500">{saving ? "Saving…" : saved ? "Saved" : "Auto-save"}</span>
          </div>
        </div>
      </div>

      {/* 1️⃣ Psychology Mode */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg">🧠</span>
          <h4 className="font-semibold">Psychology Mode</h4>
          <span className="text-xs text-zinc-500 ml-auto">Changes hook style & emotional triggers</span>
        </div>

        {/* Custom dropdown */}
        <div className="relative">
          <button
            onClick={() => setModeOpen(!modeOpen)}
            className="w-full flex items-center justify-between p-4 rounded-lg bg-zinc-800 border border-zinc-700 hover:border-violet-600 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className={`font-semibold ${selectedMode.color}`}>{selectedMode.label}</span>
              <span className="text-xs text-zinc-500">{selectedMode.desc}</span>
            </div>
            <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${modeOpen ? "rotate-180" : ""}`} />
          </button>

          {modeOpen && (
            <div className="absolute z-10 w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl overflow-hidden">
              {PSYCHOLOGY_MODES.map((mode) => (
                <button
                  key={mode.value}
                  onClick={() => {
                    updateField("psychologyMode", mode.value);
                    setModeOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 p-4 hover:bg-zinc-700 transition-colors text-left ${
                    config.psychologyMode === mode.value ? "bg-zinc-700/50" : ""
                  }`}
                >
                  <div className="flex-1">
                    <span className={`font-semibold ${mode.color}`}>{mode.label}</span>
                    <p className="text-xs text-zinc-500 mt-0.5">{mode.desc}</p>
                  </div>
                  {config.psychologyMode === mode.value && (
                    <Check className="w-4 h-4 text-violet-400" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 2️⃣ Retention Engineering Level */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg">⚡</span>
          <h4 className="font-semibold">Retention Engineering Level</h4>
          <span className="text-xs text-zinc-500 ml-auto">Controls pacing & pattern interrupt intensity</span>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {RETENTION_LEVELS.map((level) => {
            const isActive = config.retentionLevel === level.value;
            return (
              <button
                key={level.value}
                onClick={() => updateField("retentionLevel", level.value)}
                className={`relative p-4 rounded-lg border-2 transition-all text-left ${
                  isActive
                    ? "border-violet-500 bg-violet-600/10"
                    : "border-zinc-700 bg-zinc-800 hover:border-zinc-600"
                }`}
              >
                {/* Intensity bar */}
                <div className="flex gap-1 mb-2">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={`h-1.5 w-6 rounded-full ${
                        i <= level.intensity
                          ? isActive
                            ? "bg-violet-500"
                            : "bg-zinc-500"
                          : "bg-zinc-700"
                      }`}
                    />
                  ))}
                </div>
                <p className={`font-semibold text-sm ${isActive ? "text-violet-300" : "text-zinc-300"}`}>
                  {level.label}
                </p>
                <p className="text-xs text-zinc-500 mt-1">{level.desc}</p>
                {isActive && (
                  <div className="absolute top-2 right-2">
                    <Check className="w-3.5 h-3.5 text-violet-400" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {config.retentionLevel === "viral" && (
          <div className="mt-3 p-3 rounded-lg bg-red-950/30 border border-red-900/50 text-xs text-red-300">
            <strong>Viral Mode active:</strong> More pattern interrupts, more emotional triggers, faster pacing. Scripts will be more aggressive and attention-demanding.
          </div>
        )}
      </div>

      {/* 3️⃣ Intelligent Niche Rotation */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">🔄</span>
            <h4 className="font-semibold">Intelligent Niche Rotation</h4>
          </div>
          {/* Toggle */}
          <button
            onClick={() => updateField("nicheRotationEnabled", !config.nicheRotationEnabled)}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              config.nicheRotationEnabled ? "bg-violet-600" : "bg-zinc-700"
            }`}
          >
            <span
              className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                config.nicheRotationEnabled ? "translate-x-6" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>

        {config.nicheRotationEnabled ? (
          <div className="space-y-3">
            <p className="text-sm text-zinc-400">
              System rotates niches daily, avoids repeating, and uses performance-weighted selection.
            </p>

            {/* Algorithm explanation */}
            <div className="bg-zinc-800 rounded-lg p-4 text-xs space-y-1 font-mono text-zinc-400">
              <p className="text-zinc-300 font-sans text-sm font-semibold mb-2">Rotation Algorithm</p>
              <p><span className="text-amber-400">if</span> niche used yesterday → <span className="text-red-400">-70% weight</span></p>
              <p><span className="text-amber-400">if</span> niche used 2 days ago → <span className="text-orange-400">-40% weight</span></p>
              <p><span className="text-amber-400">if</span> niche high performing → <span className="text-green-400">+50% boost</span></p>
              <p><span className="text-amber-400">if</span> niche underperforming → <span className="text-red-400">-40% penalty</span></p>
              <p><span className="text-amber-400">if</span> niche never used → <span className="text-blue-400">+20% freshness</span></p>
              <p className="pt-1 text-zinc-500">Lookback window: 7 days | Min cooldown: 1 day</p>
            </div>

            {/* Rotation Summary Table */}
            {rotationSummary.length > 0 && (
              <div className="mt-4">
                <p className="text-xs text-zinc-500 mb-2">Last 7 days usage:</p>
                <div className="divide-y divide-zinc-800">
                  {rotationSummary.map((entry) => (
                    <div key={entry.nicheId} className="flex items-center justify-between py-2 text-sm">
                      <span className="font-mono text-violet-400">{entry.nicheId}</span>
                      <div className="flex items-center gap-4 text-xs text-zinc-500">
                        <span>{entry.usageCount}× used</span>
                        <span>{entry.avgViews} avg views</span>
                        <span>Last: {new Date(entry.lastUsed).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-zinc-500">
            When enabled, the system rotates niches daily — avoids repeating the same theme, tracks the past 7 days, and prevents content fatigue.
          </p>
        )}
      </div>

      {/* Agent Flow Visualization */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-4 h-4 text-amber-400" />
          <h4 className="font-semibold">Intelligent Agent Flow</h4>
          <span className="text-xs text-zinc-500 ml-auto">11-step autonomous pipeline</span>
        </div>

        <div className="grid grid-cols-1 gap-1">
          {AGENT_FLOW_STEPS.map((s, i) => (
            <div key={s.step} className="flex items-center gap-3 py-2">
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-mono text-violet-400 border border-zinc-700">
                {s.step}
              </div>
              <span className="text-sm">{s.icon}</span>
              <span className="text-sm text-zinc-300">{s.label}</span>
              {i < AGENT_FLOW_STEPS.length - 1 && (
                <span className="text-xs text-zinc-600 ml-auto">→</span>
              )}
            </div>
          ))}
        </div>

        {/* Current active config badge */}
        <div className="mt-4 p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
          <p className="text-xs text-zinc-500 mb-2">Active Configuration:</p>
          <div className="flex flex-wrap gap-2">
            <span className={`px-2 py-1 rounded text-xs font-mono ${selectedMode.color} bg-zinc-800`}>
              {selectedMode.label}
            </span>
            <span className="px-2 py-1 rounded text-xs font-mono text-violet-300 bg-zinc-800">
              {selectedRetention.label}
            </span>
            <span className={`px-2 py-1 rounded text-xs font-mono bg-zinc-800 ${config.nicheRotationEnabled ? "text-green-400" : "text-zinc-500"}`}>
              Rotation: {config.nicheRotationEnabled ? "ON" : "OFF"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
