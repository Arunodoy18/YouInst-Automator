/**
 * Instagram Uploader — Instagram Graph API integration
 *
 * Uploads Reels to Instagram via the Business/Creator account API.
 * Requires: INSTAGRAM_ACCESS_TOKEN + INSTAGRAM_BUSINESS_ACCOUNT_ID
 *
 * Flow:
 * 1. Upload video to a public URL (or hosted container)
 * 2. Create media container (IG Graph API)
 * 3. Publish container
 */
import https from "https";
import logger from "./logger";

const IG_GRAPH_BASE = "https://graph.instagram.com/v19.0";

interface IGUploadResult {
  platformVideoId: string;
  url: string;
}

/**
 * Upload a Reel to Instagram via Graph API.
 * @param videoUrl - A publicly accessible URL for the video file.
 *                   For local files, host them temporarily (e.g., via ngrok or cloud storage).
 * @param caption  - Full caption with hashtags.
 */
export async function uploadToInstagram(
  videoUrl: string,
  caption: string
): Promise<IGUploadResult> {
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  const accountId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;

  if (!accessToken || !accountId) {
    throw new Error(
      "Missing INSTAGRAM_ACCESS_TOKEN or INSTAGRAM_BUSINESS_ACCOUNT_ID in .env"
    );
  }

  logger.info("Creating Instagram Reel media container…");

  // Step 1: Create media container
  const containerRes = await igApiPost(
    `${IG_GRAPH_BASE}/${accountId}/media`,
    {
      video_url: videoUrl,
      caption,
      media_type: "REELS",
      access_token: accessToken,
    }
  );

  const containerId = containerRes.id;
  if (!containerId) {
    throw new Error(
      `Instagram container creation failed: ${JSON.stringify(containerRes)}`
    );
  }

  logger.info(`Container created: ${containerId}. Waiting for processing…`);

  // Step 2: Wait for container to finish processing
  await waitForContainerReady(containerId, accessToken);

  // Step 3: Publish
  logger.info("Publishing Reel…");
  const publishRes = await igApiPost(
    `${IG_GRAPH_BASE}/${accountId}/media_publish`,
    {
      creation_id: containerId,
      access_token: accessToken,
    }
  );

  const mediaId = publishRes.id;
  const url = `https://www.instagram.com/reel/${mediaId}/`;

  logger.info(`Instagram Reel published: ${url}`);
  return { platformVideoId: mediaId, url };
}

/**
 * Check if Instagram credentials are configured.
 */
export function isInstagramConfigured(): boolean {
  return !!(
    process.env.INSTAGRAM_ACCESS_TOKEN &&
    process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID
  );
}

// ── Helpers ──────────────────────────────────────────────────────────

async function waitForContainerReady(
  containerId: string,
  accessToken: string,
  maxAttempts: number = 30,
  intervalMs: number = 5000
): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    const status = await igApiGet(
      `${IG_GRAPH_BASE}/${containerId}?fields=status_code&access_token=${accessToken}`
    );

    if (status.status_code === "FINISHED") return;
    if (status.status_code === "ERROR") {
      throw new Error(`Instagram container processing error: ${JSON.stringify(status)}`);
    }

    logger.debug(`Container status: ${status.status_code} (attempt ${i + 1}/${maxAttempts})`);
    await sleep(intervalMs);
  }

  throw new Error("Instagram container processing timed out");
}

function igApiPost(url: string, body: Record<string, string>): Promise<any> {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(body);
    const urlObj = new URL(url);

    const req = https.request(
      {
        hostname: urlObj.hostname,
        path: urlObj.pathname + urlObj.search,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(postData),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk: Buffer) => (data += chunk.toString()));
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch {
            reject(new Error(`Invalid JSON from IG API: ${data}`));
          }
        });
      }
    );

    req.on("error", reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error("IG API request timeout")); });
    req.write(postData);
    req.end();
  });
}

function igApiGet(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let data = "";
        res.on("data", (chunk: Buffer) => (data += chunk.toString()));
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch {
            reject(new Error(`Invalid JSON from IG API: ${data}`));
          }
        });
      })
      .on("error", reject);
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
