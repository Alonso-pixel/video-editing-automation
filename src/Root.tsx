import "./index.css";
import { Composition } from "remotion";
import { FPS } from "./styles";
import { Segment00 } from "./segments/Segment00";
import { Segment02 } from "./segments/Segment02";
import { Segment04 } from "./segments/Segment04";
import { Segment08 } from "./segments/Segment08";
import { Segment10 } from "./segments/Segment10";
import { Segment13 } from "./segments/Segment13";
import { Segment15 } from "./segments/Segment15";

const SEGMENTS = [
  { id: "Segment00", component: Segment00 },
  { id: "Segment02", component: Segment02 },
  { id: "Segment04", component: Segment04 },
  { id: "Segment08", component: Segment08 },
  { id: "Segment10", component: Segment10 },
  { id: "Segment13", component: Segment13 },
  { id: "Segment15", component: Segment15 },
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
