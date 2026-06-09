import React from "react";
import { AbsoluteFill, staticFile } from "remotion";
import { Video } from "@remotion/media";
import { COLORS } from "../styles";
import { PopIn, Sfx, cardStyle } from "./overlay-kit";

export const Segment08: React.FC = () => {
  return (
    <AbsoluteFill>
      <Video src={staticFile("segments/segment_08.mp4")} />
      <PopIn delay={10} from="center">
        <div
          style={{
            ...cardStyle,
            fontSize: 64,
            background: `linear-gradient(135deg, ${COLORS.healthGreen}, ${COLORS.healthGreenLight})`,
            border: "4px solid rgba(255,255,255,0.85)",
            maxWidth: 880,
          }}
        >
          ⏸️ Ponlos en PAUSA
        </div>
      </PopIn>
      <Sfx file="ding.mp3" delay={10} volume={0.7} />
    </AbsoluteFill>
  );
};
