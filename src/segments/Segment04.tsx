import React from "react";
import { AbsoluteFill, staticFile } from "remotion";
import { Video } from "@remotion/media";
import { COLORS } from "../styles";
import { PopIn, Sfx, cardStyle } from "./overlay-kit";

export const Segment04: React.FC = () => {
  return (
    <AbsoluteFill>
      <Video src={staticFile("segments/segment_04.mp4")} />
      <PopIn delay={8} from="center">
        <div
          style={{
            ...cardStyle,
            fontSize: 60,
            background: `linear-gradient(135deg, ${COLORS.bacteriaA}, ${COLORS.bacteriaB})`,
            border: "4px solid rgba(255,255,255,0.85)",
            maxWidth: 880,
          }}
        >
          🦠 Respiran y comen
        </div>
      </PopIn>
      <Sfx file="pop.mp3" delay={8} volume={0.7} />
    </AbsoluteFill>
  );
};
