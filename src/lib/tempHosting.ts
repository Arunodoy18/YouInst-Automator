import fs from 'fs';
import path from 'path';
import logger from './logger';

/**
 * Uploads a local file to a temporary file hosting service (file.io)
 * to get a public URL for Instagram API ingestion.
 * 
 * Note: file.io links expire after 1 download or 2 weeks.
 * Ideally replaced by S3/Cloudinary in production.
 */
export async function uploadToTempHost(filePath: string): Promise<string> {
  const stats = fs.statSync(filePath);
  const fileSizeInBytes = stats.size;
  const mbSize = (fileSizeInBytes / 1024 / 1024).toFixed(2);
  
  logger.info(`Uploading to temp host (file.io) for Instagram ingestion: ${path.basename(filePath)} (${mbSize} MB)...`);

  try {
    const buffer = fs.readFileSync(filePath);
    
    // Create File object (Node 20+)
    const file = new File([buffer], path.basename(filePath), { type: 'video/mp4' });
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('expires', '1d'); // Expires in 1 day
    
    const response = await fetch('https://file.io', {
      method: 'POST',
      body: formData,
    }); // native fetch in Node 18+

    if (!response.ok) {
      throw new Error(`Upload failed with status: ${response.status} ${response.statusText}`);
    }

    const data: any = await response.json();

    if (data.success) {
      logger.info(`Temp file hosted successfully: ${data.link}`);
      return data.link;
    } else {
      throw new Error(`File.io API error: ${JSON.stringify(data)}`);
    }

  } catch (error: any) {
    logger.error(`Temp upload failed: ${error.message}`);
    throw error;
  }
}
