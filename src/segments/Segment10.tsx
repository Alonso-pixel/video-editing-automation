import React from "react";
import { AbsoluteFill, staticFile } from "remotion";
import { Video } from "@remotion/media";
import { COLORS } from "../styles";
import { PopIn, Sfx, cardStyle } from "./overlay-kit";

export const Segment10: React.FC = () => {
  return (
    <AbsoluteFill>
      <Video src={staticFile("segments/segment_10.mp4")} />
      <PopIn delay={8} from="top">
        <div
          style={{
            ...cardStyle,
            fontSize: 58,
            background: `linear-gradient(135deg, ${COLORS.bacteriaD}, ${COLORS.bacteriaE})`,
            border: "4px solid rgba(255,255,255,0.85)",
            maxWidth: 880,
          }}
        >
          🥛 Leche + Refrigerador
        </div>
      </PopIn>
      <Sfx file="whoosh.mp3" delay={8} volume={0.7} />
    </AbsoluteFill>
  );
};
