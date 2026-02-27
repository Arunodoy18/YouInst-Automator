# Background Video Assets

Place loopable video clips (`.mp4`, `.webm`, `.mov`) in the appropriate subfolder.
The **Background Engine** will randomly pick one at render time.

## Folder Mapping

| Folder              | Niche Match                | Mood / Style                                 | Current Assets |
| ------------------- | -------------------------- | -------------------------------------------- | -------------- |
| `endless_runner/`   | motivation, ai-motivation  | Aerial running tracks, cinematic movement    | ✅ Subway Surfers gameplay (44 MB) |
| `temple_run/`       | tech, ai                   | Ancient temple corridors, adventure gameplay | ✅ Temple Run gameplay (40 MB) |
| `futuristic/`       | tech, ai                   | Neon grids, abstract tech, dark sci-fi loops | ⚠️ Empty (Pexels fallback) |
| `finance/`          | finance-tech, money        | Stock tickers, dark graphs, gold particles   | ⚠️ Empty (Pexels fallback) |
| `productivity/`     | productivity               | Minimal desks, gradient flows, calm nature   | ⚠️ Empty (Pexels fallback) |
| `high_energy/`      | *keyword override*         | Fast motion, intense abstract, particle rush | ✅ Both gameplay videos (84 MB) |

## Guidelines

- **Orientation:** Portrait (1080×1920) preferred; landscape will be auto-cropped.
- **Duration:** 5–30 seconds is ideal — videos are looped to match voice-over length.
- **Style:** Dark backgrounds work best (text overlays need contrast).
- **Resolution:** 1080p minimum.
- **No watermarks or copyrighted content.**

If a folder is empty, the engine falls back to **Pexels stock video** search,
then to the **Remotion text-on-black** renderer as a last resort.
