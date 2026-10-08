import React from "react";
import { AbsoluteFill } from "remotion";
import { Video } from "@remotion/media";
import { staticFile } from "remotion";
import { PopIn, Sfx, cardStyle } from "./overlay-kit";
import { COLORS } from "../styles";

export const Segment00: React.FC = () => {
  return (
    <AbsoluteFill>
      {/* Base layer: original cropped segment */}
      <Video src={staticFile("segments/segment_00.mp4")} />

      {/* PopIn overlay */}
      <PopIn delay={6} from="center">
        <div
          style={{
            ...cardStyle,
            background: COLORS.healthGreen,
            fontSize: 52,
          }}
        >
          🥛 Búlgaros de Leche
        </div>
      </PopIn>

      {/* Sound effect */}
      <Sfx file="pop.mp3" delay={6} volume={0.8} />
    </AbsoluteFill>
  );
};
