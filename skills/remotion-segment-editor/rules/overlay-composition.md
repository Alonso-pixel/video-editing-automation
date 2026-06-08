---
name: overlay-composition
description: How to scaffold a per-chunk overlay composition (footage base layer + reused components + timed SFX) and register it in Root.tsx.
metadata:
  tags: remotion, composition, overlay, sfx, registration
---

## Goal

For each edited chunk, build a composition that plays the cropped clip as the base layer
and lays animations + sound effects on top. Match the source's dimensions/fps; never
re-render unedited chunks.

## 1. The segment component

Create `src/segments/Segment<NN>.tsx`. The cropped clip fills the frame; overlay components
sit above it; SFX play via timed `<Audio>`.

```tsx
import { AbsoluteFill, Sequence, staticFile, useVideoConfig } from "remotion";
import { Video, Audio } from "@remotion/media";
// Reuse existing project components — prefer these over new ones:
import { SpeechBubble } from "../components/SpeechBubble";
import { KefirCharacter } from "../components/KefirCharacter";

export const Segment03: React.FC = () => {
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill>
      {/* Base layer: the cropped original footage */}
      <Video src={staticFile("segments/segment_03.mp4")} />

      {/* Overlay layer(s) — reused components, animated with useCurrentFrame/interpolate/spring */}
      <Sequence from={Math.round(0.5 * fps)} layout="none">
        <SpeechBubble text="¡30+ especies!" /* ...props per the component's API... */ />
      </Sequence>

      {/* Timed sound effect (file must exist under public/) */}
      <Sequence from={Math.round(0.5 * fps)} layout="none">
        <Audio src={staticFile("tense_sound.mp3")} volume={0.7} />
      </Sequence>
    </AbsoluteFill>
  );
};
```

Notes:
- Read each reused component's real prop signature in `src/components/` before wiring it up
  (e.g. `SpeechBubble`, `KefirCharacter`, `CharacterOverlay`, `Background`, `charts/*`).
- Animate only with `useCurrentFrame()` / `interpolate()` / `spring()`. No CSS or Tailwind
  animation classes — they don't render.
- Use `<Sequence from={...}>` to time when an overlay/SFX appears within the 5s.
- Pull colors/timing from `src/styles.ts` (`COLORS`, `FPS`) to stay consistent.

## 1a. Advanced overlay effects with `<HtmlInCanvas>` (PREFERRED for shader/canvas effects)

When an overlay wants an effect plain CSS can't deliver — a shader dissolve, blur,
displacement/ripple, glitch, or any WebGL transition — wrap that overlay in `<HtmlInCanvas>`
from `remotion`. It draws the overlay DOM into a `<canvas>` and lets you post-process it in
`onPaint` (Canvas 2D) or `onInit`+`onPaint` (WebGL). Use the **source** `width`/`height`/`fps`
from `useVideoConfig()` — never hardcode dimensions. Keep simple text/badge pop-ins on plain
`interpolate`/`spring`; only route an overlay through canvas when the effect needs it.

The effect amount is driven by `useCurrentFrame()`, and — like every overlay — it must
**dissolve to nothing before the last frame** (see §1b). Here a Canvas 2D blur + fade tied to
the chunk's exit window:

```tsx
import {
  AbsoluteFill,
  HtmlInCanvas,
  type HtmlInCanvasOnPaint,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { useCallback } from "react";

export const ShaderDissolveOverlay: React.FC<{ delay: number }> = ({ delay }) => {
  const frame = useCurrentFrame();
  const { width, height, fps, durationInFrames } = useVideoConfig();

  const onPaint: HtmlInCanvasOnPaint = useCallback(
    ({ canvas, element, elementImage }) => {
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Failed to acquire 2D context");

      // Entrance: sharpen + fade in over ~0.3s after the delay.
      const appear = interpolate(frame - delay, [0, 9], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
      // Exit: blur up + fade out over the final ~0.45s → clean footage at the cut.
      const exitStart = durationInFrames - Math.round(0.45 * fps);
      const disappear = interpolate(frame, [exitStart, durationInFrames - 1], [1, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
      const blurPx = interpolate(appear * disappear, [0, 1], [24, 0]);

      ctx.reset();
      ctx.globalAlpha = appear * disappear;
      ctx.filter = `blur(${blurPx}px)`;
      const transform = ctx.drawElementImage(elementImage, 0, 0);
      element.style.transform = transform.toString();
    },
    [frame, fps, durationInFrames, delay],
  );

  return (
    <HtmlInCanvas width={width} height={height} onPaint={onPaint}>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        {/* the overlay DOM — reuse existing components where possible */}
        <SpeechBubble text="¡30+ especies!" />
      </AbsoluteFill>
    </HtmlInCanvas>
  );
};
```

For **WebGL shader transitions**, set up the context/program/texture in `onInit` (return a
cleanup fn), then in `onPaint` upload the captured DOM with
`gl.texElementImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, elementImage)` and
draw. Don't inline a full shader here — follow the `remotion-best-practices` skill's
`rules/html-in-canvas.md` and the Remotion WebGL demo it links.

Constraints (from the API + Remotion):
- **Never nest `<HtmlInCanvas>` inside another** — Remotion throws; merge into one effect.
- Requires **Chrome 149+ with `chrome://flags/#canvas-draw-element`**; WebGL requires the
  `angle` GL renderer (already set via `Config.setChromiumOpenGlRenderer("angle")` in
  `remotion.config.ts`; CLI equivalent is `--gl=angle`). **Give the user a notice** when a
  segment relies on it.
- CSS transforms on the source element are ignored for drawing — always assign the transform
  returned by `drawElementImage` back to `element.style.transform` so DOM/paint stay aligned.
- `onPaint` may be `async` (Remotion holds the frame via `delayRender()`) for multi-pass effects.

**Fallback (REQUIRED):** if the `canvas-draw-element` flag/environment isn't available, build
the overlay with the plain CSS opacity/scale dissolve in §1b instead, so the render always
succeeds.

## 1b. Dissolve every overlay before the chunk ends (REQUIRED)

The edited chunk is spliced back among untouched originals. If an overlay is still on screen
at the chunk's final frame, the stitched video shows it **snap away** at the cut — a visible
seam. To avoid this, every overlay shape must **dissolve out** (fade + slight scale-down) and
be fully invisible *before* the last frame, so the clip ends on the clean original footage and
joins the next section seamlessly.

Rule of thumb: reserve the **last ~0.4–0.5s** of the chunk for the exit. Drive both the
entrance and the exit from `useCurrentFrame()` against `durationInFrames`:

```tsx
const frame = useCurrentFrame();
const { fps, durationInFrames } = useVideoConfig();

// Entrance: fade/scale in over the first ~0.3s after the overlay's start delay.
const appear = interpolate(frame - delay, [0, 9], [0, 1], {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
});

// Exit: fade out over the final ~0.45s so nothing is visible at the cut.
const exitStart = durationInFrames - Math.round(0.45 * fps);
const disappear = interpolate(frame, [exitStart, durationInFrames - 1], [1, 0], {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
});

const opacity = appear * disappear;
const scale = interpolate(disappear, [0, 1], [0.92, 1]); // gentle shrink on the way out
```

Apply `opacity` (and optionally `scale`) to **every** overlay element — text cards, badges,
checklists, stamps, charts. Staggered multi-item overlays should all share the same exit
window so they dissolve together cleanly. Wrap shared exit logic in a reusable helper
(e.g. an `overlay-kit.tsx` `PopIn`/`Dissolve` wrapper that takes `delay` and reads
`durationInFrames`) so each segment stays terse.

SFX do **not** need this treatment — let them play out naturally; only the visible *shapes*
must dissolve before the cut.

## 2. SFX must live in public/

`staticFile()` only resolves files under `public/`. Sound effects are authored in
`src/sound-effects/`. If a chosen SFX isn't already in `public/`, copy it there first:

```bash
# create dir if needed, then copy
Copy-Item src/sound-effects/<name>.mp3 public/<name>.mp3
```

(`tense_sound.mp3` is already present in `public/` — the existing compositions reference it.)

## 3. Register in Root.tsx

Add a `<Composition>` for the chunk in `src/Root.tsx`. Use the **source** dimensions/fps from
probing (do NOT assume 1080×1920) and set `durationInFrames` from the chunk's real length.

```tsx
import { Segment03 } from "./segments/Segment03";

<Composition
  id="Segment03"
  component={Segment03}
  durationInFrames={Math.round(5 * FPS)}  // last chunk: round(chunkLength * fps)
  fps={FPS}                                 // = source fps
  width={1080}                              // = source width
  height={1920}                             // = source height
/>
```

If the source fps/dimensions differ from the project's `FPS`/1080×1920 defaults, use the
probed values literally instead of the `FPS` constant.

## 4. Render

```bash
npx remotion render Segment<NN> out/segment_<NN>_edited.mp4
```

The cropped footage carries its own audio; the `<Audio>` SFX mixes on top. Leave the segment
component and its `Root.tsx` registration in place so the user can tweak and re-render.
