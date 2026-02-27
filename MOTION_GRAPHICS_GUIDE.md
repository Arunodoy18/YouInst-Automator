# 🎬 Motion Graphics Customization Guide

This guide shows you how to customize visual effects and motion graphics to make your videos more futuristic and engaging.

---

## 🎨 Available Custom Presets

The system includes 6 pre-built futuristic styles in `src/lib/customVisualPresets.ts`:

### 1. **ultra_futuristic** 🚀
*Maximum cyberpunk vibes*
- Bright cyan/magenta accents
- Fast camera motion with high grain
- Glitch effects & chromatic aberration
- Rapid attention pulses (every 4s)
- **Best for:** Tech content, AI topics, viral trends

### 2. **matrix** 💚
*Green terminal aesthetic*
- Matrix-style green color scheme
- Typewriter caption animations
- Digital scan lines
- Medium motion intensity
- **Best for:** Coding content, hacker themes, programming

### 3. **neon_cyberpunk** 💖
*Hot pink/cyan dual tone like Cyberpunk 2077*
- Heavy glitch effects
- Night city neon vibes
- Strong RGB split effect
- Maximum energy
- **Best for:** Gaming content, urban themes, viral shorts

### 4. **hologram** 🔷
*Transparent blue tech overlay*
- Clean holographic UI feel
- Smooth low motion
- Light blue accents
- Minimal grain for elegance
- **Best for:** Professional tech, AI demos, corporate content

### 5. **digital_chaos** ⚡
*Maximum energy for viral content*
- Extreme motion & effects
- Pulse every 2 seconds
- Heavy distortion
- Lightning-fast captions
- **Best for:** Shocking facts, viral hooks, high-energy content

### 6. **tron** 🔵
*Clean blue grid aesthetic*
- Modern sci-fi elegance
- No glitch (clean digital look)
- Electric blue accents
- Smooth motion
- **Best for:** Futuristic tech, modern AI, sleek presentations

---

## 🛠️ How to Use Custom Presets

### Method 1: In Code (orchestrator.ts)

```typescript
import { applyCustomPreset } from "./customVisualPresets";

// In runFullPipeline function, around line 350:
const customPreset = applyCustomPreset("ultra_futuristic");

const processedBg = await composeMotion(
  backgroundPath,
  voiceDuration,
  outputDir,
  {
    ...customPreset.motion,  // Apply custom motion settings
    intensity: customPreset.visual.motionIntensity,
  }
);

const finalVideo = await renderWithCaptions(
  processedBg,
  voicePath,
  captions,
  outputDir,
  {
    bgMusicPath,
    style: customPreset.caption,  // Apply custom caption style
  }
);
```

### Method 2: Environment Variable (Recommended)

Add to your `.env` file:

```bash
# Custom visual preset (optional)
VISUAL_PRESET=ultra_futuristic
# Options: ultra_futuristic, matrix, neon_cyberpunk, hologram, digital_chaos, tron
```

### Method 3: Per-Video CLI Override

```bash
# Generate with custom preset
npx ts-node src/cli/generate.ts --preset=neon_cyberpunk

# List available presets
npx ts-node src/cli/generate.ts --list-presets
```

---

## ⚙️ Create Your Own Custom Preset

Edit `src/lib/customVisualPresets.ts` and add your preset:

```typescript
export const CUSTOM_PRESETS = {
  // ... existing presets ...
  
  my_custom_style: {
    visual: {
      mode: "futuristic",           // or: endless_runner, temple_run, etc.
      accentColor: "#FF5500",        // Your custom color (hex)
      motionIntensity: "high",       // low | medium | high
      patternInterruptSec: 5,        // Seconds between pulses
      captionStyle: "bold_center",   // bold_center | typewriter | pop_in
    },
    motion: {
      intensity: "high",             // Pan speed
      patternInterruptSec: 5,
      enableGrain: true,             // Film texture
      enableVignette: true,          // Edge darkening
      glowColor: "#FF5500",          // Glow overlay color
      glitchIntensity: 20,           // 0-100 (0 = no glitch)
      chromaticAberration: 4,        // RGB split in pixels
      enableScanlines: true,         // CRT scan lines
    },
    caption: {
      accentColor: "#FFFF00",        // Power word highlight color
      fontSize: 80,                  // 60-100 recommended
      fadeMs: 150,                   // Fade speed in milliseconds
    },
    description: "My custom futuristic preset",
  },
};
```

---

## 🎯 Motion Graphics Parameters Explained

### Motion Intensity
- **low** - Slow 20px pan over 20 seconds
- **medium** - 50px pan over 12 seconds (default)
- **high** - 80px pan over 7 seconds (energetic)

### Pattern Interrupts
Periodic brightness pulses to recapture attention:
- **2-4 seconds** - High energy, viral content
- **5-7 seconds** - Balanced engagement
- **8-10 seconds** - Calm, educational content

### Grain Strength
Film texture overlay:
- **low** - 4 (subtle texture)
- **medium** - 8 (cinematic feel)
- **high** - 14 (heavy retro film)

### Caption Styles
- **bold_center** - Large centered text, instant appearance
- **typewriter** - Text types in character by character
- **pop_in** - Words bounce in with scaling effect

### Power Words
Automatically highlighted in accent color:
- never, always, secret, shocking, amazing
- incredible, dangerous, billion, money
- hack, truth, banned, exposed, urgent
- impossible, guaranteed, deadly, etc.

---

## 🎥 Background Video + Motion Effects

Your current setup:
```
Temple Run gameplay      → temple_run mode    → Golden accents, high motion
Subway Surfers gameplay  → endless_runner     → Orange accents, high motion  
```

Motion effects are **stacked on top** of your gameplay:
1. ✅ Your gameplay video plays
2. ✅ Ken Burns pan adds camera movement
3. ✅ Film grain adds cinematic texture
4. ✅ Vignette adds depth
5. ✅ Pattern interrupts add engagement pulses
6. ✅ Color grading matches the preset

**Both work together!**

---

## 🚀 Quick Start Examples

### Example 1: Ultra Futuristic Tech Video
```typescript
// In orchestrator.ts or custom script:
const preset = applyCustomPreset("ultra_futuristic");
// Topic: "How AI will change coding in 2026"
// Background: Temple Run gameplay
// Result: Fast cyan-glowing tech aesthetic over gameplay
```

### Example 2: Matrix Hacker Theme
```typescript
const preset = applyCustomPreset("matrix");
// Topic: "Secret programming tricks developers hide"
// Background: Pexels tech video (or your gameplay)
// Result: Green terminal vibes with typewriter captions
```

### Example 3: Viral High-Energy
```typescript
const preset = applyCustomPreset("digital_chaos");
// Topic: "This AI feature SHOCKED everyone"
// Background: Subway Surfers (high motion)
// Result: Maximum viral energy with rapid effects
```

---

## 📊 Preset Comparison Table

| Preset | Motion | Glitch | Colors | Best For |
|--------|--------|--------|--------|----------|
| **ultra_futuristic** | High | Medium | Cyan/Magenta | Tech, AI topics |
| **matrix** | Medium | Low | Green | Code, hacking |
| **neon_cyberpunk** | High | Heavy | Pink/Cyan | Gaming, urban |
| **hologram** | Low | Minimal | Blue | Professional tech |
| **digital_chaos** | High | Extreme | Multi-color | Viral content |
| **tron** | Medium | None | Blue | Modern sci-fi |

---

## 🔧 Advanced: Per-Effect Control

If you want even more control, modify `src/lib/motionComposer.ts`:

### Add Custom ffmpeg Filters

In `buildFilterChain()` function (line ~167), add your filters:

```typescript
// Example: Add color shift effect
filters.push("hue=s=1.5:h=30*sin(2*PI*t/10)");

// Example: Add glow effect
filters.push("gblur=sigma=5[blurred]; [0:v][blurred]overlay");

// Example: Add scanlines
filters.push("drawgrid=w=iw:h=4:t=1:c=black@0.2");
```

---

## 💡 Tips for Maximum Futuristic Effect

1. **Combine preset + gameplay** - Your Temple Run/Subway videos + futuristic preset = 🔥
2. **Match colors to topic** - Blue/cyan for tech, green for money, pink for viral
3. **Higher motion = more viral** - Fast pan + high energy = better retention
4. **Test presets** - Generate same topic with different presets, see what works
5. **Season variety** - Rotate presets weekly for fresh look

---

## 🎬 Next Steps

1. **Test a preset:** Generate a video with `--preset=ultra_futuristic`
2. **Compare results:** Same topic, different presets
3. **Create your own:** Add to `customVisualPresets.ts`
4. **Measure performance:** Track which presets get better retention

**Want help implementing?** Let me know which preset you want to try! 🚀
