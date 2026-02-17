/**
 * Visual Strategy Selector
 *
 * Intelligently maps niche × topic × psychology mode → visual background strategy.
 * Determines the full visual personality for each rendered video:
 *   - Background asset category (endless_runner, futuristic, etc.)
 *   - Caption accent color (for keyword highlighting)
 *   - Motion intensity level (controls pan speed, grain, interrupts)
 *   - Caption animation style
 *
 * Priority chain:
 *   1. Keyword overrides in the topic text (highest-priority match wins)
 *   2. Niche-based default mapping
 *   3. Fallback: "futuristic" mode
 *   4. Psychology mode optionally adjusts motion intensity
 */

/* ── Types ─────────────────────────────────────────────────────────── */

export type BackgroundMode =
  | "endless_runner"
  | "temple_run"
  | "futuristic"
  | "finance"
  | "productivity"
  | "high_energy";

export type CaptionStyle = "bold_center" | "typewriter" | "pop_in";

export interface VisualStrategy {
  /** Which background asset folder to pull from */
  mode: BackgroundMode;
  /** Hex accent color for keyword highlighting in captions */
  accentColor: string;
  /** Controls pan amplitude, grain strength, interrupt frequency */
  motionIntensity: "low" | "medium" | "high";
  /** Seconds between pattern-interrupt brightness pulses */
  patternInterruptSec: number;
  /** Caption entrance animation style */
  captionStyle: CaptionStyle;
}

/* ── Niche → Mode Default Map ──────────────────────────────────────── */

const NICHE_MODE_MAP: Record<string, BackgroundMode> = {
  tech: "temple_run",
  ai: "temple_run",
  "ai-motivation": "endless_runner",
  "finance-tech": "finance",
  money: "finance",
  productivity: "productivity",
  motivation: "endless_runner",
};

/* ── Keyword Overrides (checked against topic text) ────────────────── */

const KEYWORD_OVERRIDES: Array<{
  keywords: string[];
  mode: BackgroundMode;
  priority: number;
}> = [
  {
    keywords: [
      "shocking",
      "insane",
      "crazy",
      "unbelievable",
      "wild",
      "broke the internet",
      "mind-blowing",
      "jaw-dropping",
    ],
    mode: "high_energy",
    priority: 10,
  },
  {
    keywords: [
      "grind",
      "discipline",
      "hustle",
      "never give up",
      "champion",
      "warrior",
      "unstoppable",
    ],
    mode: "endless_runner",
    priority: 8,
  },
  {
    keywords: [
      "money",
      "rich",
      "wealth",
      "million",
      "billionaire",
      "profit",
      "investment",
      "passive income",
    ],
    mode: "finance",
    priority: 7,
  },
  {
    keywords: [
      "code",
      "programming",
      "hack",
      "developer",
      "algorithm",
      "neural",
      "robot",
      "quantum",
    ],
    mode: "futuristic",
    priority: 6,
  },
  {
    keywords: [
      "calm",
      "focus",
      "routine",
      "zen",
      "morning",
      "mindful",
      "balance",
      "deep work",
    ],
    mode: "productivity",
    priority: 5,
  },
];

/* ── Psychology Mode → Motion Intensity ────────────────────────────── */

const PSYCH_INTENSITY_MAP: Record<string, VisualStrategy["motionIntensity"]> = {
  aggressive: "high",
  controversial: "high",
  inspirational: "medium",
  educational: "low",
  calm: "low",
};

/* ── Mode Profiles (visual defaults per background mode) ───────────── */

const MODE_PROFILES: Record<BackgroundMode, Omit<VisualStrategy, "mode">> = {
  endless_runner: {
    accentColor: "#FF6B35",
    motionIntensity: "high",
    patternInterruptSec: 5,
    captionStyle: "bold_center",
  },
  temple_run: {
    accentColor: "#FFD700",
    motionIntensity: "high",
    patternInterruptSec: 5,
    captionStyle: "bold_center",
  },
  futuristic: {
    accentColor: "#00D4FF",
    motionIntensity: "medium",
    patternInterruptSec: 7,
    captionStyle: "typewriter",
  },
  finance: {
    accentColor: "#00FF88",
    motionIntensity: "medium",
    patternInterruptSec: 8,
    captionStyle: "bold_center",
  },
  productivity: {
    accentColor: "#A78BFA",
    motionIntensity: "low",
    patternInterruptSec: 10,
    captionStyle: "pop_in",
  },
  high_energy: {
    accentColor: "#FF2D55",
    motionIntensity: "high",
    patternInterruptSec: 4,
    captionStyle: "bold_center",
  },
};

/* ── Public API ────────────────────────────────────────────────────── */

/**
 * Select the visual strategy for a video.
 *
 * @param niche          Active niche ID (e.g. "tech", "motivation")
 * @param topic          Full topic string — scanned for keyword overrides
 * @param psychologyMode Optional psychology mode from intelligence config
 * @returns Complete visual strategy object
 */
export function selectVisualStrategy(
  niche: string,
  topic: string,
  psychologyMode?: string
): VisualStrategy {
  const topicLower = topic.toLowerCase();

  // ── 1. Check keyword overrides (highest priority wins) ──────────
  let selectedMode: BackgroundMode | null = null;
  let highestPriority = -1;

  for (const override of KEYWORD_OVERRIDES) {
    if (override.priority > highestPriority) {
      const matched = override.keywords.some((kw) => topicLower.includes(kw));
      if (matched) {
        selectedMode = override.mode;
        highestPriority = override.priority;
      }
    }
  }

  // ── 2. Fall back to niche default ───────────────────────────────
  if (!selectedMode) {
    selectedMode = NICHE_MODE_MAP[niche] ?? "futuristic";
  }

  // ── 3. Build strategy from mode profile ─────────────────────────
  const profile = { ...MODE_PROFILES[selectedMode] };

  // ── 4. Psychology mode can override motion intensity ────────────
  if (psychologyMode && PSYCH_INTENSITY_MAP[psychologyMode]) {
    profile.motionIntensity = PSYCH_INTENSITY_MAP[psychologyMode];
  }

  return {
    mode: selectedMode,
    ...profile,
  };
}
