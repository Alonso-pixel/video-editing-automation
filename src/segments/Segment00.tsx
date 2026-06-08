import React from "react";
import { AbsoluteFill, staticFile } from "remotion";
import { Video } from "@remotion/media";
import { COLORS } from "../styles";
import { PopIn, Sfx, cardStyle } from "./overlay-kit";

export const Segment00: React.FC = () => {
  return (
    <AbsoluteFill>
      <Video src={staticFile("segments/segment_00.mp4")} />
      <PopIn delay={10} from="top">
        <div
          style={{
            ...cardStyle,
            fontSize: 64,
            background: `linear-gradient(135deg, ${COLORS.warningRed}, ${COLORS.warningRedLight})`,
            border: "4px solid rgba(255,255,255,0.85)",
            maxWidth: 880,
          }}
        >
          ¿Miedo de matarlos? 😰
        </div>
      </PopIn>
      <Sfx file="record-scratch.mp3" delay={10} volume={0.7} />
    </AbsoluteFill>
  );
};
