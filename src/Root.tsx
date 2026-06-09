import "./index.css";
import { Composition } from "remotion";
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
          durationInFrames={Math.round(5 * 24)}
          fps={24}
          width={720}
          height={1280}
        />
      ))}
    </>
  );
};
