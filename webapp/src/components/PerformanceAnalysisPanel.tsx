"use client";

import { useState, useCallback } from "react";
import {
  Brain,
  Loader2,
  TrendingUp,
  TrendingDown,
  Timer,
  Lightbulb,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Gauge,
  Zap,
  BarChart3,
} from "lucide-react";

// ── Types (mirrors PerformanceAnalysis from engine) ──────────────────

interface HookEffectiveness {
  rating: "excellent" | "good" | "average" | "poor";
  score: number;
  explanation: string;
}

interface IdealVideoLength {
  recommendedSec: number;
  reasoning: string;
}

interface BestPerformingNiche {
  nicheId: string;
  avgScore: number;
  reason: string;
}

interface HookStyleRec {
  style: string;
  example: string;
  reasoning: string;
}

interface ScriptPacingAdj {
  currentAssessment: string;
  recommendation: string;
  targetRetentionLevel: "basic" | "enhanced" | "viral";
}

interface NicheWeightingAdj {
  increaseWeight: string[];
  decreaseWeight: string[];
  reasoning: string;
}

interface PerformanceAnalysis {
  whatWorked: string[];
  whatFailed: string[];
  hookEffectiveness: HookEffectiveness;
  idealVideoLength: IdealVideoLength;
  bestPerformingNiche: BestPerformingNiche;
  engagementPatterns: string[];
  improvements: [string, string, string];
  hookStyleRecommendation: HookStyleRec;
  scriptPacingAdjustment: ScriptPacingAdj;
  nicheWeightingAdjustment: NicheWeightingAdj;
  videoCount: number;
  analysisDate: string;
  confidenceLevel: "high" | "medium" | "low";
}

// ── Color helpers ────────────────────────────────────────────────────

const HOOK_RATING_COLOR: Record<string, string> = {
  excellent: "text-green-400",
  good: "text-emerald-400",
  average: "text-amber-400",
  poor: "text-red-400",
};

const HOOK_RATING_BG: Record<string, string> = {
  excellent: "bg-green-600/20 border-green-700/50",
  good: "bg-emerald-600/20 border-emerald-700/50",
  average: "bg-amber-600/20 border-amber-700/50",
  poor: "bg-red-600/20 border-red-700/50",
};

const RETENTION_COLOR: Record<string, string> = {
  basic: "text-zinc-400",
  enhanced: "text-violet-400",
  viral: "text-red-400",
};

const CONFIDENCE_BADGE: Record<string, { color: string; label: string }> = {
  high: { color: "bg-green-900/30 text-green-400 border-green-800/50", label: "High confidence" },
  medium: { color: "bg-amber-900/30 text-amber-400 border-amber-800/50", label: "Medium confidence" },
  low: { color: "bg-zinc-800 text-zinc-400 border-zinc-700", label: "Low confidence" },
};

// ── Component ────────────────────────────────────────────────────────

export default function PerformanceAnalysisPanel() {
  const [analysis, setAnalysis] = useState<PerformanceAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metricsCount, setMetricsCount] = useState(0);

  const runAnalysis = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/analyze-performance?lookbackDays=30");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Analysis failed");
      setAnalysis(data.analysis);
      setMetricsCount(data.metricsCollected ?? 0);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Empty state ──
  if (!analysis && !loading) {
    return (
      <div className="bg-gradient-to-r from-indigo-900/30 to-cyan-900/30 rounded-xl border border-indigo-700/40 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-600/30 flex items-center justify-center">
              <Brain className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="font-bold text-lg">AI Performance Analysis</h3>
              <p className="text-sm text-zinc-400">
                Analyze your content metrics with AI — get diagnostics, improvements, and auto-tuning recommendations
              </p>
            </div>
          </div>
          <button
            onClick={runAnalysis}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            <Zap className="w-4 h-4" />
            Run Analysis
          </button>
        </div>
        {error && (
          <div className="mt-4 p-3 rounded-lg bg-red-950/30 border border-red-900/50 text-sm text-red-300">
            {error}
          </div>
        )}
      </div>
    );
  }

  // ── Loading state ──
  if (loading) {
    return (
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-8">
        <div className="flex flex-col items-center gap-3 text-zinc-400">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
          <p className="text-sm">Running AI performance analysis on your videos…</p>
          <p className="text-xs text-zinc-600">This may take a few seconds</p>
        </div>
      </div>
    );
  }

  if (!analysis) return null;

  const conf = CONFIDENCE_BADGE[analysis.confidenceLevel];

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="bg-gradient-to-r from-indigo-900/30 to-cyan-900/30 rounded-xl border border-indigo-700/40 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Brain className="w-5 h-5 text-indigo-400" />
            <div>
              <h3 className="font-bold">AI Performance Analysis</h3>
              <p className="text-xs text-zinc-500">
                {metricsCount} videos analyzed — {new Date(analysis.analysisDate).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-2 py-1 rounded text-xs border ${conf.color}`}>{conf.label}</span>
            <button
              onClick={runAnalysis}
              className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors"
              title="Re-run analysis"
            >
              <RefreshCw className="w-3.5 h-3.5 text-zinc-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Row 1: Hook effectiveness + Ideal video length + Best niche */}
      <div className="grid grid-cols-3 gap-4">
        {/* Hook Effectiveness */}
        <div className={`rounded-xl border p-4 ${HOOK_RATING_BG[analysis.hookEffectiveness.rating]}`}>
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-zinc-400" />
            <span className="text-xs text-zinc-400 font-medium">Hook Effectiveness</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-bold ${HOOK_RATING_COLOR[analysis.hookEffectiveness.rating]}`}>
              {analysis.hookEffectiveness.score}
            </span>
            <span className={`text-sm font-semibold uppercase ${HOOK_RATING_COLOR[analysis.hookEffectiveness.rating]}`}>
              {analysis.hookEffectiveness.rating}
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-2 line-clamp-2">{analysis.hookEffectiveness.explanation}</p>
        </div>

        {/* Ideal Video Length */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Timer className="w-4 h-4 text-zinc-400" />
            <span className="text-xs text-zinc-400 font-medium">Ideal Video Length</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-cyan-400">{analysis.idealVideoLength.recommendedSec}</span>
            <span className="text-sm text-zinc-500">seconds</span>
          </div>
          <p className="text-xs text-zinc-500 mt-2 line-clamp-2">{analysis.idealVideoLength.reasoning}</p>
        </div>

        {/* Best Performing Niche */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-4 h-4 text-zinc-400" />
            <span className="text-xs text-zinc-400 font-medium">Best Niche</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-violet-400 font-mono">{analysis.bestPerformingNiche.nicheId}</span>
            <span className="text-sm text-zinc-500">({analysis.bestPerformingNiche.avgScore}/100)</span>
          </div>
          <p className="text-xs text-zinc-500 mt-2 line-clamp-2">{analysis.bestPerformingNiche.reason}</p>
        </div>
      </div>

      {/* Row 2: What worked / What failed */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <h4 className="font-semibold text-sm flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-green-400" />
            What Worked
          </h4>
          <ul className="space-y-2">
            {analysis.whatWorked.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <ArrowUpRight className="w-3.5 h-3.5 mt-0.5 text-green-400 flex-shrink-0" />
                <span className="text-zinc-300">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <h4 className="font-semibold text-sm flex items-center gap-2 mb-3">
            <TrendingDown className="w-4 h-4 text-red-400" />
            What Failed
          </h4>
          <ul className="space-y-2">
            {analysis.whatFailed.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <ArrowDownRight className="w-3.5 h-3.5 mt-0.5 text-red-400 flex-shrink-0" />
                <span className="text-zinc-300">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Row 3: Engagement patterns */}
      {analysis.engagementPatterns.length > 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <h4 className="font-semibold text-sm flex items-center gap-2 mb-3">
            <Gauge className="w-4 h-4 text-amber-400" />
            Engagement Patterns
          </h4>
          <div className="flex flex-wrap gap-2">
            {analysis.engagementPatterns.map((pattern, i) => (
              <span key={i} className="px-3 py-1.5 rounded-lg bg-zinc-800 text-xs text-zinc-300 border border-zinc-700">
                {pattern}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Row 4: 3 Improvements */}
      <div className="rounded-xl border border-indigo-800/50 bg-indigo-950/20 p-4">
        <h4 className="font-semibold text-sm flex items-center gap-2 mb-3">
          <Lightbulb className="w-4 h-4 text-amber-400" />
          3 Improvements for Next Video
        </h4>
        <div className="grid grid-cols-3 gap-3">
          {analysis.improvements.map((imp, i) => (
            <div key={i} className="p-3 rounded-lg bg-zinc-900/80 border border-zinc-800">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-5 h-5 rounded-full bg-indigo-600/30 flex items-center justify-center text-xs font-bold text-indigo-400">
                  {i + 1}
                </span>
              </div>
              <p className="text-sm text-zinc-300">{imp}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Row 5: Hook recommendation + Pacing + Niche weights */}
      <div className="grid grid-cols-3 gap-4">
        {/* Hook Style */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <h4 className="font-semibold text-sm mb-3">Hook Style Recommendation</h4>
          <p className="text-sm font-mono text-violet-400 mb-1">{analysis.hookStyleRecommendation.style}</p>
          <div className="p-2 rounded bg-zinc-800 text-xs text-zinc-300 italic mb-2">
            &ldquo;{analysis.hookStyleRecommendation.example}&rdquo;
          </div>
          <p className="text-xs text-zinc-500">{analysis.hookStyleRecommendation.reasoning}</p>
        </div>

        {/* Script Pacing */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <h4 className="font-semibold text-sm mb-3">Script Pacing Adjustment</h4>
          <p className="text-xs text-zinc-500 mb-2">{analysis.scriptPacingAdjustment.currentAssessment}</p>
          <p className="text-sm text-zinc-300 mb-2">{analysis.scriptPacingAdjustment.recommendation}</p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500">Target:</span>
            <span className={`px-2 py-0.5 rounded text-xs font-mono font-semibold ${RETENTION_COLOR[analysis.scriptPacingAdjustment.targetRetentionLevel]} bg-zinc-800`}>
              {analysis.scriptPacingAdjustment.targetRetentionLevel}
            </span>
          </div>
        </div>

        {/* Niche Weighting */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <h4 className="font-semibold text-sm mb-3">Niche Weight Adjustment</h4>
          {analysis.nicheWeightingAdjustment.increaseWeight.length > 0 && (
            <div className="mb-2">
              <span className="text-xs text-zinc-500">Increase:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {analysis.nicheWeightingAdjustment.increaseWeight.map((n) => (
                  <span key={n} className="px-2 py-0.5 rounded text-xs font-mono bg-green-900/30 text-green-400 border border-green-800/50">
                    {n} ↑
                  </span>
                ))}
              </div>
            </div>
          )}
          {analysis.nicheWeightingAdjustment.decreaseWeight.length > 0 && (
            <div className="mb-2">
              <span className="text-xs text-zinc-500">Decrease:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {analysis.nicheWeightingAdjustment.decreaseWeight.map((n) => (
                  <span key={n} className="px-2 py-0.5 rounded text-xs font-mono bg-red-900/30 text-red-400 border border-red-800/50">
                    {n} ↓
                  </span>
                ))}
              </div>
            </div>
          )}
          <p className="text-xs text-zinc-500 mt-1">{analysis.nicheWeightingAdjustment.reasoning}</p>
        </div>
      </div>
    </div>
  );
}
