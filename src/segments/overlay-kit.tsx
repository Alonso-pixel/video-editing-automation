import React from "react";
import {
  AbsoluteFill,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { Audio } from "@remotion/media";
import { COLORS, FONTS } from "../styles";

/**
 * Exit dissolve: fades the overlay out over the final ~0.45s of the chunk so nothing is
 * visible at the cut, keeping the splice into the next section seamless. Returns the exit
 * opacity (1 → 0) and a gentle shrink scale.
 */
export const useDissolve = (exitSeconds = 0.45) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const exitStart = durationInFrames - Math.round(exitSeconds * fps);
  const out = interpolate(frame, [exitStart, durationInFrames - 1], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return { opacity: out, scale: interpolate(out, [0, 1], [0.92, 1]) };
};

/** Spring scale + fade pop-in that also dissolves out before the chunk ends. */
export const PopIn: React.FC<{
  delay?: number;
  from?: "top" | "center" | "bottom";
  children: React.ReactNode;
}> = ({ delay = 0, from = "top", children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 12, mass: 0.7 } });
  const appearScale = interpolate(s, [0, 1], [0.7, 1]);
  const appear = interpolate(frame - delay, [0, 8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const exit = useDissolve();
  const justify = from === "top" ? "flex-start" : from === "bottom" ? "flex-end" : "center";
  const pad = from === "top" ? "180px 0 0" : from === "bottom" ? "0 0 220px" : "0";
  return (
    <AbsoluteFill
      style={{
        justifyContent: justify,
        alignItems: "center",
        padding: pad,
        transform: `scale(${appearScale * exit.scale})`,
        opacity: appear * exit.opacity,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

/** Subtle continuous shake for "danger" emphasis. */
export const useShake = (delay = 0, amplitude = 6) => {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - delay);
  const decay = interpolate(f, [0, 25], [1, 0.25], { extrapolateRight: "clamp" });
  return Math.sin(f * 1.4) * amplitude * decay;
};

export const cardStyle: React.CSSProperties = {
  fontFamily: FONTS.heading,
  fontWeight: 800,
  color: COLORS.textPrimary,
  padding: "28px 44px",
  borderRadius: 28,
  textAlign: "center",
  boxShadow: "0 18px 50px rgba(0,0,0,0.45)",
  lineHeight: 1.1,
};

/** Timed SFX cue. */
export const Sfx: React.FC<{ file: string; delay?: number; volume?: number }> = ({
  file,
  delay = 0,
  volume = 0.8,
}) => (
  <Sequence from={delay} layout="none">
    <Audio src={staticFile(file)} volume={volume} />
  </Sequence>
);
