import { google } from "googleapis";
import fs from "fs";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Upload a video file to YouTube using OAuth2 credentials
 * from environment variables. Includes retry with exponential backoff.
 */
export async function uploadToYouTube(
  videoPath: string,
  title: string,
  description: string,
  tags: string[] = ["shorts", "ai", "viral"],
  categoryId: string = "22",
  maxRetries: number = 3
): Promise<string> {
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "Missing YouTube OAuth2 env vars (YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REFRESH_TOKEN)."
    );
  }

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    "urn:ietf:wg:oauth:2.0:oob"
  );

  oauth2Client.setCredentials({ refresh_token: refreshToken });

  const youtube = google.youtube({ version: "v3", auth: oauth2Client });

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`  → Uploading to YouTube (attempt ${attempt}/${maxRetries})…`);

      const res = await youtube.videos.insert({
        part: ["snippet", "status"],
        requestBody: {
          snippet: {
            title,
            description,
            tags,
            categoryId,
          },
          status: {
            privacyStatus: "public",
            selfDeclaredMadeForKids: false,
          },
        },
        media: {
          body: fs.createReadStream(videoPath),
        },
      });

      const videoId = res.data.id;
      const url = `https://youtube.com/shorts/${videoId}`;
      console.log(`  → YouTube upload complete: ${url}`);
      return url;
    } catch (err: any) {
      const isRetryable = /ECONNRESET|ETIMEDOUT|ENOTFOUND|socket hang up|network|5\d\d/i.test(
        err.message || ""
      );

      if (attempt < maxRetries && isRetryable) {
        const delay = Math.min(2000 * Math.pow(2, attempt - 1), 30000);
        console.log(`  ⚠ YouTube attempt ${attempt} failed (${err.message}), retrying in ${delay / 1000}s…`);
        await sleep(delay);
      } else {
        throw err;
      }
    }
  }

  throw new Error("YouTube upload exhausted all retries");
}
