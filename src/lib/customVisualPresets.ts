/**
 * Custom Visual Presets — User-defined motion graphics overrides
 * 
 * Use this file to create custom visual styles for your videos.
 * These presets override the default mode settings in visualSelector.ts
 * 
 * Usage in orchestrator:
 *   const customPreset = CUSTOM_PRESETS["ultra_futuristic"];
 *   // Pass to composeMotion() and renderWithCaptions()
 */

import type { VisualStrategy } from "./visualSelector";
import type { MotionConfig } from "./motionComposer";
import type { CaptionStyleConfig } from "./captionAnimator";

/* ── Custom Motion Presets ──────────────────────────────────────────── */

/**
 * Extended motion config with additional futuristic effects
 */
export interface ExtendedMotionConfig extends MotionConfig {
  /** Additional color overlay for futuristic glow */
  glowColor?: string;
  /** Glitch effect intensity (0-100) */
  glitchIntensity?: number;
  /** Chromatic aberration amount in pixels */
  chromaticAberration?: number;
  /** Digital scan lines overlay */
  enableScanlines?: boolean;
}

/* ── Preset Library ────────────────────────────────────────────────── */

export const CUSTOM_PRESETS: Record<string, {
  visual: Partial<VisualStrategy>;
  motion: Partial<ExtendedMotionConfig>;
  caption: Partial<CaptionStyleConfig>;
  description: string;
}> = {
  
  /**
   * ULTRA FUTURISTIC - Maximum cyberpunk vibes
   * - Fast motion with high grain
   * - Bright cyan/magenta accents
   * - Rapid pattern interrupts
   * - Large bold captions
   */
  ultra_futuristic: {
    visual: {
      mode: "futuristic",
      accentColor: "#00FFFF",      // Bright cyan
      motionIntensity: "high",      // Fast pan
      patternInterruptSec: 4,       // Pulse every 4s
      captionStyle: "bold_center",
    },
    motion: {
      intensity: "high",
      patternInterruptSec: 4,
      enableGrain: true,
      enableVignette: true,
      glowColor: "#00FFFF",         // Cyan glow overlay
      glitchIntensity: 15,          // Subtle glitch effect
      chromaticAberration: 3,       // RGB split effect
      enableScanlines: true,        // CRT-style scan lines
    },
    caption: {
      accentColor: "#FF00FF",       // Magenta power words
      fontSize: 80,                 // Larger text
      fadeMs: 150,                  // Faster fade
    },
    description: "Maximum cyberpunk: fast motion, glitch effects, neon accents",
  },

  /**
   * MATRIX STYLE - Green terminal aesthetic
   * - Medium motion with code-like feel
   * - Green/black color scheme
   * - Typewriter captions
   */
  matrix: {
    visual: {
      mode: "futuristic",
      accentColor: "#00FF00",       // Matrix green
      motionIntensity: "medium",
      patternInterruptSec: 8,
      captionStyle: "typewriter",
    },
    motion: {
      intensity: "medium",
      patternInterruptSec: 8,
      enableGrain: true,
      enableVignette: true,
      glowColor: "#00FF00",
      glitchIntensity: 5,
      enableScanlines: true,
    },
    caption: {
      accentColor: "#00FF00",
      fontSize: 68,
      fadeMs: 200,
    },
    description: "Matrix-style: green terminal, code aesthetic, digital rain vibe",
  },

  /**
   * NEON CYBERPUNK - Hot pink/cyan dual tone
   * - High energy motion
   * - Alternating neon colors
   * - Heavy vignette for night city feel
   */
  neon_cyberpunk: {
    visual: {
      mode: "high_energy",
      accentColor: "#FF00FF",       // Hot pink
      motionIntensity: "high",
      patternInterruptSec: 3,
      captionStyle: "bold_center",
    },
    motion: {
      intensity: "high",
      patternInterruptSec: 3,
      enableGrain: true,
      enableVignette: true,
      glowColor: "#FF00FF",
      glitchIntensity: 25,          // Heavy glitch
      chromaticAberration: 5,       // Strong RGB split
    },
    caption: {
      accentColor: "#00FFFF",       // Cyan contrast
      fontSize: 85,
      fadeMs: 100,                  // Very fast
    },
    description: "Cyberpunk 2077: pink/cyan neon, heavy glitch, night city energy",
  },

  /**
   * HOLOGRAM - Transparent blue tech overlay
   * - Smooth low motion for elegance
   * - Blue holographic accent
   * - Light grain for projection feel
   */
  hologram: {
    visual: {
      mode: "futuristic",
      accentColor: "#4DA6FF",       // Light blue
      motionIntensity: "low",
      patternInterruptSec: 10,
      captionStyle: "pop_in",
    },
    motion: {
      intensity: "low",
      patternInterruptSec: 10,
      enableGrain: true,
      enableVignette: false,        // No vignette for clean hologram
      glowColor: "#4DA6FF",
      glitchIntensity: 3,           // Minimal glitch
    },
    caption: {
      accentColor: "#66D9FF",
      fontSize: 72,
      fadeMs: 300,                  // Smooth fade
    },
    description: "Holographic UI: smooth motion, clean blue tech, elegant sci-fi",
  },

  /**
   * DIGITAL CHAOS - Maximum energy for viral content
   * - Extreme motion and effects
   * - Rapid color shifts
   * - Heavy grain and distortion
   */
  digital_chaos: {
    visual: {
      mode: "high_energy",
      accentColor: "#FF0066",
      motionIntensity: "high",
      patternInterruptSec: 2,       // Pulse every 2s!
      captionStyle: "bold_center",
    },
    motion: {
      intensity: "high",
      patternInterruptSec: 2,
      enableGrain: true,
      enableVignette: true,
      glitchIntensity: 40,          // Maximum glitch
      chromaticAberration: 8,       // Extreme RGB split
      enableScanlines: true,
    },
    caption: {
      accentColor: "#FFFF00",       // Yellow shout
      fontSize: 90,                 // Maximum size
      fadeMs: 80,                   // Lightning fast
    },
    description: "Viral chaos: maximum everything, rapid cuts, attention-grabbing",
  },

  /**
   * TRON LEGACY - Blue grid aesthetic
   * - Medium smooth motion
   * - Electric blue accents
   * - Clean modern sci-fi
   */
  tron: {
    visual: {
      mode: "futuristic",
      accentColor: "#00D9FF",
      motionIntensity: "medium",
      patternInterruptSec: 6,
      captionStyle: "typewriter",
    },
    motion: {
      intensity: "medium",
      patternInterruptSec: 6,
      enableGrain: false,           // Clean digital look
      enableVignette: true,
      glowColor: "#00D9FF",
      glitchIntensity: 0,           // No glitch for clean look
      chromaticAberration: 0,
      enableScanlines: false,
    },
    caption: {
      accentColor: "#00D9FF",
      fontSize: 75,
      fadeMs: 250,
    },
    description: "Tron Legacy: clean blue grid, smooth motion, modern sci-fi elegance",
  },

};

/* ── Helper: Apply Custom Preset ────────────────────────────────────── */

/**
 * Apply a custom preset to override default visual strategy
 * 
 * @param presetName Key from CUSTOM_PRESETS
 * @returns Configuration objects for motion, visual, and captions
 */
export function applyCustomPreset(presetName: keyof typeof CUSTOM_PRESETS) {
  const preset = CUSTOM_PRESETS[presetName];
  if (!preset) {
    throw new Error(`Custom preset "${presetName}" not found`);
  }
  return preset;
}

/**
 * List all available custom presets with descriptions
 */
export function listCustomPresets(): Array<{ name: string; description: string }> {
  return Object.entries(CUSTOM_PRESETS).map(([name, preset]) => ({
    name,
    description: preset.description,
  }));
}
