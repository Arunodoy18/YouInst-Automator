import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

/**
 * GET /api/voices — Return all available voice profiles
 * Merges built-in profiles with any cloned voices from cloned-voices.json
 */
export async function GET() {
  try {
    const clonedVoicesPath = path.resolve(process.cwd(), "../cloned-voices.json");
    let clonedVoices: Record<string, any> = {};

    if (fs.existsSync(clonedVoicesPath)) {
      try {
        clonedVoices = JSON.parse(fs.readFileSync(clonedVoicesPath, "utf-8"));
      } catch { /* ignore */ }
    }

    // Also check workspace root (when running from webapp/)
    const altPath = path.resolve(process.cwd(), "cloned-voices.json");
    if (fs.existsSync(altPath) && Object.keys(clonedVoices).length === 0) {
      try {
        clonedVoices = JSON.parse(fs.readFileSync(altPath, "utf-8"));
      } catch { /* ignore */ }
    }

    // Transform cloned voices into the webapp format
    const clonedProfiles = Object.entries(clonedVoices).map(([id, profile]: [string, any]) => ({
      id,
      label: `🎤 ${profile.label || id}`,
      desc: profile.description || `Cloned voice — ${profile.language || "hindi"}`,
      category: "cloned",
      language: profile.language || "hindi",
      hasElevenLabs: !!profile.elevenlabs,
    }));

    return NextResponse.json({ clonedVoices: clonedProfiles });
  } catch (error: any) {
    return NextResponse.json({ clonedVoices: [], error: error.message }, { status: 200 });
  }
}
