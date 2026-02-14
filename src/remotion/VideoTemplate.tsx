import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  Sequence,
} from "remotion";

/* ── Caption Scene (timed to Whisper output) ──────────────────────── */

interface SceneProps {
  text: string;
  durationInFrames: number;
}

const Scene: React.FC<SceneProps> = ({ text, durationInFrames }) => {
  const frame = useCurrentFrame();
  const fadeIn = 8;
  const fadeOut = 8;

  const opacity = interpolate(
    frame,
    [0, fadeIn, durationInFrames - fadeOut, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const scale = interpolate(frame, [0, fadeIn], [0.88, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const translateY = interpolate(frame, [0, fadeIn], [30, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0a0a0a",
        justifyContent: "center",
        alignItems: "center",
        padding: 60,
      }}
    >
      <div
        style={{
          opacity,
          transform: `scale(${scale}) translateY(${translateY}px)`,
          color: "#ffffff",
          fontSize: 72,
          fontWeight: 900,
          fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif",
          textAlign: "center",
          lineHeight: 1.25,
          textShadow: "0 4px 40px rgba(0,0,0,0.7), 0 0 80px rgba(99,102,241,0.15)",
          maxWidth: 920,
          letterSpacing: -1,
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};

/* ── Types ────────────────────────────────────────────────────────── */

export interface TimedCaption {
  text: string;
  start: number; // seconds
  end: number;   // seconds
}

export interface VideoTemplateProps {
  /** Legacy: evenly-split scene strings */
  scenes?: string[];
  /** New: Whisper-timed captions with start/end times */
  captions?: TimedCaption[];
}

/* ── Main Component ──────────────────────────────────────────────── */

export const VideoTemplate: React.FC<VideoTemplateProps> = ({
  scenes,
  captions,
}) => {
  const { fps, durationInFrames } = useVideoConfig();

  // If we have timed captions from Whisper, use precise timing
  if (captions && captions.length > 0) {
    return (
      <AbsoluteFill style={{ backgroundColor: "#0a0a0a" }}>
        {captions.map((cap, i) => {
          const fromFrame = Math.round(cap.start * fps);
          const toFrame = Math.round(cap.end * fps);
          const dur = Math.max(toFrame - fromFrame, 1);
          return (
            <Sequence key={i} from={fromFrame} durationInFrames={dur}>
              <Scene text={cap.text} durationInFrames={dur} />
            </Sequence>
          );
        })}
      </AbsoluteFill>
    );
  }

  // Fallback: evenly-split scenes (legacy)
  const sceneList = scenes ?? ["…"];
  const framesPerScene = Math.floor(durationInFrames / sceneList.length);

  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0a" }}>
      {sceneList.map((text, i) => (
        <Sequence key={i} from={i * framesPerScene} durationInFrames={framesPerScene}>
          <Scene text={text} durationInFrames={framesPerScene} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
