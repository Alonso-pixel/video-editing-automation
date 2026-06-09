import { AbsoluteFill, Sequence, staticFile, useVideoConfig } from "remotion";
import { Video, Audio } from "@remotion/media";
import { PopIn, cardStyle } from "./overlay-kit";

export const Segment00: React.FC = () => {
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill>
      {/* Base layer: the cropped original footage */}
      <Video src={staticFile("segments/segment_00.mp4")} />

      {/* Overlay layer */}
      <Sequence from={Math.round(0.5 * fps)} layout="none">
        <PopIn from="center">
          <div style={{ ...cardStyle, background: "linear-gradient(to right, #EF5350, #FFCCBC)" }}>
            ¡Dato Sorprendente! 😰
          </div>
        </PopIn>
      </Sequence>

      {/* Timed sound effect */}
      <Sequence from={Math.round(0.5 * fps)} layout="none">
        <Audio src={staticFile("pop.mp3")} volume={0.8} />
      </Sequence>
    </AbsoluteFill>
  );
};
