import React from "react";
import { AbsoluteFill, Sequence, staticFile } from "remotion";
import { Audio } from "@remotion/media";
import { Background } from "./components/Background";
import { Scene1_MicrobialLoad } from "./components/scenes/Scene1_MicrobialLoad";
import { Scene2_Diversity } from "./components/scenes/Scene2_Diversity";
import { Scene3_Lactose } from "./components/scenes/Scene3_Lactose";
import { FPS } from "./styles";
import type { KefirAnimationProps } from "./Root";

/**
 * Scene proportions based on the voiceover script:
 * Scene 1 (Microbial Load): ~37.5% of total  (15s of 40s)
 * Scene 2 (Diversity):      ~32.5% of total  (13s of 40s)
 * Scene 3 (Lactose):        ~30.0% of total  (12s of 40s)
 */
const SCENE_PROPORTIONS = {
  scene1: 0.375,
  scene2: 0.325,
  scene3: 0.3,
} as const;

export const MyComposition: React.FC<KefirAnimationProps> = ({
  audioDurationInSeconds,
}) => {
  const totalDuration = audioDurationInSeconds;

  // Compute scene durations in frames from audio duration
  const s1Duration = Math.round(totalDuration * SCENE_PROPORTIONS.scene1 * FPS);
  const s2Duration = Math.round(totalDuration * SCENE_PROPORTIONS.scene2 * FPS);
  const s3Duration = Math.round(totalDuration * SCENE_PROPORTIONS.scene3 * FPS);

  const s1Start = 0;
  const s2Start = s1Duration;
  const s3Start = s1Duration + s2Duration;

  return (
    <AbsoluteFill>
      {/* Voiceover audio — plays from the start */}
      <Audio src={staticFile("animation_voiceover.mp3")} />

      {/* Background — always visible */}
      <Sequence from={0}>
        <Background />
      </Sequence>

      {/* Scene 1 — Microbial Load Bar Chart */}
      <Sequence from={s1Start} durationInFrames={s1Duration}>
        <Scene1_MicrobialLoad />
      </Sequence>

      {/* Scene 2 — Microbiota Diversity Donut */}
      <Sequence from={s2Start} durationInFrames={s2Duration}>
        <Scene2_Diversity />
      </Sequence>

      {/* Scene 3 — Lactose Digestion Comparison */}
      <Sequence from={s3Start} durationInFrames={s3Duration}>
        <Scene3_Lactose />
      </Sequence>
    </AbsoluteFill>
  );
};
