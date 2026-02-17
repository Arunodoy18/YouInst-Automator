import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import logger from './logger';

const execAsync = promisify(exec);

/**
 * Uploads a local file to a temporary file hosting service
 * to get a public URL for Instagram API ingestion.
 * 
 * Strategy: Try multiple hosts in order until one succeeds.
 */
export async function uploadToTempHost(filePath: string): Promise<string> {
  const stats = fs.statSync(filePath);
  const mbSize = (stats.size / 1024 / 1024).toFixed(2);
  
  logger.info(`Uploading to temp host: ${path.basename(filePath)} (${mbSize} MB)...`);

  // Try hosts in order of reliability
  // Note: 0x0.st sometimes blocks Meta crawlers, so try tmpfiles first for IG
  const hosts = [
    () => uploadToTmpfiles(filePath),
    () => uploadTo0x0(filePath),
    () => uploadToFileIO(filePath),
  ];

  for (const tryHost of hosts) {
    try {
      const url = await tryHost();
      if (url) {
        logger.info(`Temp file hosted: ${url}`);
        return url;
      }
    } catch (err: any) {
      logger.warn(`Host attempt failed: ${err.message}`);
    }
  }

  throw new Error('All temp hosting services failed');
}

/**
 * Upload via tmpfiles.org — simple REST API, 100MB limit, 1 hour expiry.
 */
async function uploadToTmpfiles(filePath: string): Promise<string> {
  const buffer = fs.readFileSync(filePath);
  const file = new File([buffer], path.basename(filePath), { type: 'video/mp4' });
  
  const formData = new FormData();
  formData.append('file', file);
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5 * 60 * 1000);

  const response = await fetch('https://tmpfiles.org/api/v1/upload', {
    method: 'POST',
    body: formData,
    signal: controller.signal,
  });

  clearTimeout(timeoutId);

  if (!response.ok) {
    throw new Error(`tmpfiles.org: ${response.status} ${response.statusText}`);
  }

  const data: any = await response.json();
  if (data.status === 'success' && data.data?.url) {
    // tmpfiles.org returns a page URL like https://tmpfiles.org/12345/video.mp4
    // Convert to direct download URL: https://tmpfiles.org/dl/12345/video.mp4
    const directUrl = data.data.url.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
    return directUrl;
  }
  throw new Error(`tmpfiles.org error: ${JSON.stringify(data)}`);
}

/**
 * Upload via 0x0.st — simple, reliable, supports up to 512MB.
 * Files expire based on size (min 30 days for small files).
 */
async function uploadTo0x0(filePath: string): Promise<string> {
  // Use curl.exe explicitly on Windows (PowerShell aliases curl to Invoke-WebRequest)
  const curlBin = process.platform === 'win32' ? 'curl.exe' : 'curl';
  const escapedPath = filePath.replace(/\\/g, '/');
  const cmd = `${curlBin} -s -F "file=@${escapedPath}" https://0x0.st`;
  
  const { stdout } = await execAsync(cmd, { 
    maxBuffer: 10 * 1024 * 1024,
    timeout: 300_000, // 5 min timeout
  });

  const url = stdout.trim();
  if (!url.startsWith('http')) {
    throw new Error(`0x0.st returned unexpected response: ${url.substring(0, 200)}`);
  }
  return url;
}

/**
 * Upload via file.io — expires after first download.
 */
async function uploadToFileIO(filePath: string): Promise<string> {
  const buffer = fs.readFileSync(filePath);
  const file = new File([buffer], path.basename(filePath), { type: 'video/mp4' });
  
  const formData = new FormData();
  formData.append('file', file);
  formData.append('expires', '1d');
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5 * 60 * 1000);

  const response = await fetch('https://file.io', {
    method: 'POST',
    body: formData,
    signal: controller.signal,
  });

  clearTimeout(timeoutId);

  if (!response.ok) {
    throw new Error(`file.io: ${response.status} ${response.statusText}`);
  }

  const text = await response.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`file.io returned non-JSON: ${text.substring(0, 200)}`);
  }

  if (data.success) return data.link;
  throw new Error(`file.io error: ${JSON.stringify(data)}`);
}
