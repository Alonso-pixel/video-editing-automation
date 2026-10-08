import React from "react";
import { AbsoluteFill, OffthreadVideo, staticFile } from "remotion";
import { COLORS } from "../styles";
import { PopIn, Sfx, cardStyle, useShake } from "./overlay-kit";

export const Segment00: React.FC = () => {
  const shakeX = useShake(12, 5);

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bgDark }}>
      {/* Background Video */}
      <OffthreadVideo
        src={staticFile("segments/segment_00.mp4")}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />

      {/* Top Title Banner */}
      <PopIn from="top" delay={0}>
        <div
          style={{
            ...cardStyle,
            background: "linear-gradient(135deg, #FF4B4B, #9B111E)",
            color: COLORS.textPrimary,
            fontSize: 48,
            letterSpacing: 1.5,
            padding: "20px 40px",
            border: "4px solid rgba(255, 255, 255, 0.8)",
            textTransform: "uppercase",
          }}
        >
          ¡CUIDADO DE BÚLGAROS!
        </div>
      </PopIn>

      {/* Lower Callout Box */}
      <PopIn from="bottom" delay={12}>
        <div
          style={{
            ...cardStyle,
            background: "rgba(15, 23, 42, 0.88)",
            backdropFilter: "blur(12px)",
            border: `3px solid ${COLORS.yeastA}`,
            color: COLORS.textPrimary,
            fontSize: 40,
            transform: `translateX(${shakeX}px)`,
          }}
        >
          <span style={{ color: COLORS.yeastA, display: "block", fontSize: 28, marginBottom: 8 }}>
            ⚠️ TIPS DE CULTIVO
          </span>
          ¡Mantén tus búlgaros sanos y activos!
        </div>
      </PopIn>

      {/* Sound Effects */}
      <Sfx file="sound-effects/pop.mp3" delay={0} volume={0.7} />
      <Sfx file="sound-effects/whoosh.mp3" delay={12} volume={0.6} />
    </AbsoluteFill>
  );
};
