import React from "react";
import { Composition, registerRoot } from "remotion";
import { VideoTemplate } from "./VideoTemplate";

/**
 * Remotion Root — defines all compositions available for rendering.
 * The `defaultProps` here are overridden at render-time via inputProps.
 */
const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="ShortsVideo"
        component={VideoTemplate as unknown as React.FC<Record<string, unknown>>}
        durationInFrames={300}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          scenes: ["Loading…"],
        }}
      />
    </>
  );
};

registerRoot(RemotionRoot);
