import { getAudioDurationInSeconds } from "@remotion/media-utils";

export const getAudioDuration = async (src: string) => {
  const durationInSeconds = await getAudioDurationInSeconds(src);
  return durationInSeconds;
};
