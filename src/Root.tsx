import "./index.css";
import { Composition } from "remotion";
import { FPS } from "./styles";
import { Segment00 } from "./segments/Segment00";

const SEGMENTS = [
  { id: "Segment00", component: Segment00 },
] as const;

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {SEGMENTS.map(({ id, component }) => (
        <Composition
          key={id}
          id={id}
          component={component}
          durationInFrames={Math.round(5 * FPS)}
          fps={FPS}
          width={1080}
          height={1920}
        />
      ))}
    </>
  );
};
