/**
 * Stock Video Provider
 *
 * Fetches background stock videos from Pexels API (free, high-quality).
 * Downloads vertical (9:16) videos for use as backgrounds.
 */
import https from "https";
import fs from "fs";
import path from "path";
import logger from "./logger";

const PEXELS_API_KEY = process.env.PEXELS_API_KEY;

interface PexelsVideo {
  id: number;
  url: string;
  video_files: Array<{
    id: number;
    quality: string;
    width: number;
    height: number;
    link: string;
    file_type: string;
  }>;
}

/**
 * Search Pexels for a vertical background video matching the topic.
 * Returns the local file path of the downloaded video, or null.
 */
export async function fetchStockVideo(
  query: string,
  outputDir: string
): Promise<string | null> {
  if (!PEXELS_API_KEY) {
    logger.info("No PEXELS_API_KEY set, skipping stock video background.");
    return null;
  }

  const outFile = path.resolve(outputDir, "stock_bg.mp4");
  const searchUrl = `https://api.pexels.com/videos/search?query=${encodeURIComponent(
    query
  )}&per_page=5&orientation=portrait&size=medium`;

  try {
    const data = await fetchJson(searchUrl, {
      Authorization: PEXELS_API_KEY,
    });

    const videos: PexelsVideo[] = data.videos || [];
    if (videos.length === 0) {
      // Fallback generic search
      const fallbackData = await fetchJson(
        `https://api.pexels.com/videos/search?query=technology+abstract&per_page=5&orientation=portrait&size=medium`,
        { Authorization: PEXELS_API_KEY }
      );
      const fallbackVids: PexelsVideo[] = fallbackData.videos || [];
      if (fallbackVids.length === 0) return null;
      videos.push(...fallbackVids);
    }

    // Pick random video, prefer HD vertical
    const video = videos[Math.floor(Math.random() * videos.length)];
    const vFile = video.video_files
      .filter((f) => f.height >= f.width && f.quality === "hd")
      .sort((a, b) => b.height - a.height)[0]
      || video.video_files
        .filter((f) => f.height >= f.width)
        .sort((a, b) => b.height - a.height)[0]
      || video.video_files[0];

    if (!vFile?.link) return null;

    logger.info(`Downloading stock video: ${vFile.width}x${vFile.height}`);
    await downloadFile(vFile.link, outFile);
    return outFile;
  } catch (err: any) {
    logger.warn(`Stock video fetch failed: ${err.message}`);
    return null;
  }
}

// ── Helpers ──────────────────────────────────────────────────────────

function fetchJson(url: string, headers: Record<string, string> = {}): Promise<any> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers }, (res) => {
      let data = "";
      res.on("data", (chunk: Buffer) => (data += chunk.toString()));
      res.on("end", () => {
        try { resolve(JSON.parse(data)); }
        catch { reject(new Error("Failed to parse Pexels response")); }
      });
    });
    req.on("error", reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error("Pexels request timeout")); });
  });
}

function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);

    const doGet = (currentUrl: string) => {
      const getter = currentUrl.startsWith("https") ? https : require("http");
      getter
        .get(currentUrl, (res: any) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            doGet(res.headers.location);
            return;
          }
          res.pipe(file);
          file.on("finish", () => { file.close(); resolve(); });
        })
        .on("error", (err: Error) => {
          fs.unlink(dest, () => {});
          reject(err);
        });
    };

    doGet(url);
  });
}
