/**
 * Express API Server for YouInst-Automator
 * Handles video generation requests from Netlify frontend
 */

import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { generateAIVideo, AIVideoOptions } from "../lib/aiOrchestrator";

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// Health check
app.get("/health", (req, res) => {
  res.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    version: "2.0.0-opensource",
  });
});

// API info
app.get("/api", (req, res) => {
  res.json({
    name: "YouInst-Automator API",
    version: "2.0.0",
    endpoints: {
      health: "GET /health",
      generate: "POST /api/generate",
      status: "GET /api/status/:jobId",
    },
  });
});

// Generate video endpoint
app.post("/api/generate", async (req, res) => {
  try {
    const { script, topic, style, voice, enhance, includeSubtitles } = req.body;
    
    // Validation
    if (!script || !topic) {
      return res.status(400).json({ 
        error: "Missing required fields: script, topic" 
      });
    }
    
    if (!['general', 'anime', 'cinematic'].includes(style)) {
      return res.status(400).json({ 
        error: "Invalid style. Must be: general, anime, or cinematic" 
      });
    }
    
    // Create output directory
    const jobId = `video-${Date.now()}`;
    const outputDir = path.join(process.cwd(), "output", jobId);
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    console.log(`[API] New video generation request: ${jobId}`);
    console.log(`  Topic: ${topic}`);
    console.log(`  Style: ${style}`);
    
    // Generate video
    const result = await generateAIVideo({
      script,
      topic,
      style: style || "general",
      voice: voice || "default",
      outputDir,
      enhance: enhance || false,
      includeSubtitles: includeSubtitles !== false, // Default true
    });
    
    if (result.success) {
      console.log(`[API] ✅ Video generated successfully: ${jobId}`);
      res.json({
        success: true,
        jobId,
        videoPath: result.videoPath,
        audioPath: result.audioPath,
        fileSize: result.fileSize,
        duration: result.duration,
      });
    } else {
      console.error(`[API] ❌ Video generation failed: ${result.error}`);
      res.status(500).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error: any) {
    console.error(`[API] Error: ${error.message}`);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Get job status (for future async implementation)
app.get("/api/status/:jobId", (req, res) => {
  const { jobId } = req.params;
  const outputDir = path.join(process.cwd(), "output", jobId);
  
  if (!fs.existsSync(outputDir)) {
    return res.status(404).json({ error: "Job not found" });
  }
  
  const videoPath = path.join(outputDir, "video_final.mp4");
  const exists = fs.existsSync(videoPath);
  
  res.json({
    jobId,
    status: exists ? "completed" : "processing",
    videoPath: exists ? videoPath : null,
  });
});

// List recent videos
app.get("/api/videos", (req, res) => {
  try {
    const outputDir = path.join(process.cwd(), "output");
    const folders = fs.readdirSync(outputDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => {
        const folderPath = path.join(outputDir, dirent.name);
        const stats = fs.statSync(folderPath);
        return {
          jobId: dirent.name,
          createdAt: stats.birthtime,
        };
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 20); // Last 20 videos
    
    res.json({ videos: folders });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(`[API] Unhandled error: ${err.message}`);
  res.status(500).json({ 
    error: "Internal server error",
    message: err.message 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 YouInst-Automator API Server`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`   Port: ${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   API: http://localhost:${PORT}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
});

export default app;
