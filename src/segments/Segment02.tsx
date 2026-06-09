import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Video } from "@remotion/media";
import { COLORS, FONTS } from "../styles";
import { Sfx, useDissolve, useShake, cardStyle } from "./overlay-kit";

export const Segment02: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const exit = useDissolve();
  const shake = useShake(12, 7);
  const s = spring({ frame: frame - 10, fps, config: { damping: 11, mass: 0.7 } });
  const appearScale = interpolate(s, [0, 1], [0.7, 1]);
  const appear = interpolate(frame - 10, [0, 8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill>
      <Video src={staticFile("segments/segment_02.mp4")} />
      <AbsoluteFill
        style={{
          justifyContent: "flex-start",
          alignItems: "center",
          padding: "170px 60px 0",
          opacity: appear * exit.opacity,
          transform: `translateX(${shake}px) scale(${appearScale * exit.scale})`,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
          <div
            style={{
              ...cardStyle,
              fontSize: 40,
              padding: "12px 32px",
              borderRadius: 18,
              background: COLORS.warningRed,
              letterSpacing: 4,
            }}
          >
            ⚠️ EL ERROR
          </div>
          <div
            style={{
              ...cardStyle,
              fontFamily: FONTS.heading,
              fontSize: 50,
              fontWeight: 700,
              background: "rgba(11,29,38,0.86)",
              border: `3px solid ${COLORS.warningRed}`,
              maxWidth: 860,
            }}
          >
            Tratarlos como un alimento más
          </div>
        </div>
      </AbsoluteFill>
      <Sfx file="error-buzz.mp3" delay={10} volume={0.6} />
    </AbsoluteFill>
  );
};
