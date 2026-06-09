import React from "react";
import { AbsoluteFill, staticFile } from "remotion";
import { Video } from "@remotion/media";
import { COLORS } from "../styles";
import { PopIn, Sfx, cardStyle } from "./overlay-kit";

export const Segment15: React.FC = () => {
  return (
    <AbsoluteFill>
      <Video src={staticFile("segments/segment_15.mp4")} />
      <PopIn delay={8} from="center">
        <div
          style={{
            ...cardStyle,
            fontSize: 56,
            background: `linear-gradient(135deg, ${COLORS.healthGreen}, #43A047)`,
            border: "4px solid rgba(255,255,255,0.85)",
            maxWidth: 880,
          }}
        >
          ✅ ¡Más fácil de lo que crees!
        </div>
      </PopIn>
      <Sfx file="clapping.mp3" delay={8} volume={0.7} />
    </AbsoluteFill>
  );
};
