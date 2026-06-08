---
name: remotion-segment-editor
description: Enhance a source video (e.g. Veo footage) with Remotion animation/SFX overlays on a per-5-second-chunk basis. Plans edits in edited_script.md, crops only the chunks that need edits with FFmpeg, builds an overlay composition per chunk, and renders each — so the whole video is never re-rendered — then stitches the edited chunks back together with the untouched original chunks into one full-length final video the same duration as the source.
argument-hint: "<absolute-path-to-video> <absolute-path-to-srt>"
metadata:
  tags: remotion, ffmpeg, video, overlay, segments, sfx, veo
---

## When to use

Use this skill when the user has a source video where **every scene is 5 seconds long**
and wants to add Remotion animations and sound effects on top of *specific moments*
without rendering the whole video. The user provides:

- an **absolute path** to the source video, and
- an **absolute path** to a `.srt` subtitle file whose cues carry the script text with
  ordered start/end timings.

This skill produces the planning doc, the cropped clips, the per-chunk overlay
compositions, and the rendered `.mp4` for each edited chunk — then **always** assembles a
single full-length `out/final.mp4`, identical in duration to the source, by cropping the
*unedited* chunks straight from the source (a fast FFmpeg trim, no Remotion render) and
concatenating everything in order so overlays land only on the edited chunks. The whole
video is never re-rendered: Remotion only ever touches the edited chunks.

Also load the `remotion-best-practices` skill for general Remotion/FFmpeg domain knowledge.

## Core rules

- **Always deliver the full-length video.** The job is NOT finished after rendering edited
  chunks. You MUST run the assembly step (step 7) so the final deliverable is one continuous
  `out/final.mp4` the same length as the source — unedited chunks taken verbatim from the
  original, edited chunks carrying the overlays. Never hand back only the edited segments. This
  holds even if only one chunk (or zero chunks) was edited.
- **Never re-render the whole video.** Only crop and render the chunks that get edits.
- **Overlay, don't replace.** The cropped original clip plays as the base layer; animations
  and SFX are layered on top.
- **Reuse existing components.** Prefer components in `src/components/` (KefirCharacter,
  SpeechBubble, CharacterOverlay, Background, `charts/*`). Build new components only when
  nothing existing fits.
- **Match the footage.** Composition `width`/`height`/`fps` come from probing the source,
  not assumed (do NOT hardcode 1080×1920).
- **Animate the Remotion way.** Only `useCurrentFrame()` / `interpolate()` / `spring()`.
  CSS transitions/animations and Tailwind animation classes are FORBIDDEN — they don't render.
- **Prefer `<HtmlInCanvas>` for advanced effects.** When an overlay calls for an effect that
  plain CSS can't do — shader dissolves, blur/displacement/glitch, WebGL transitions — build it
  with `<HtmlInCanvas>` from `remotion`, drawing the overlay DOM into a canvas and
  post-processing it in `onPaint` (Canvas 2D) or `onInit`+`onPaint` (WebGL). The effect amount
  is still driven by `useCurrentFrame()`. Simple text/badge pop-ins stay on plain
  `interpolate`/`spring` — don't route them through canvas. Recipe in
  [rules/overlay-composition.md](rules/overlay-composition.md); deeper API notes in the
  `remotion-best-practices` skill's `rules/html-in-canvas.md`.
  - **Environment caveat:** `<HtmlInCanvas>` only works in **Chrome 149+ with
    `chrome://flags/#canvas-draw-element` enabled**, and WebGL needs the `angle` GL renderer
    (already set in `remotion.config.ts`). Give the user a notice when you use it, and fall back
    to the CSS dissolve below when the flag isn't available so renders never break.
- **Dissolve overlays before the cut.** Every overlay shape must animate OUT (fade/scale
  dissolve) and be fully gone by the last frame of its chunk, so the edited clip ends on the
  clean original footage. This guarantees a seamless splice into the next section — no overlay
  ever pops away at a hard cut. This invariant applies to `<HtmlInCanvas>` effects too: drive the
  effect amount from `useCurrentFrame()` against `durationInFrames` so the canvas resolves to
  clean footage by the final frame. See [rules/overlay-composition.md](rules/overlay-composition.md).
- **Leave the comps in place** after rendering so the user can tweak them.

## Workflow

### 1. Probe the source video

Run `npx remotion ffprobe "<absolute-path>"` and read **duration**, **width**, **height**,
and **fps**. See [rules/segment-cropping.md](rules/segment-cropping.md) for the exact
commands to extract each value cleanly.

Compute the chunk layout:
- `chunkCount = ceil(duration / 5)`
- Chunk `N` (0-based) covers `[5N, min(5N + 5, duration))` seconds.
- The **final chunk may be shorter than 5s** — use its real length, not 5s.

### 2. Parse the `.srt` and map cues to chunks, then decide what to edit

Read the `.srt` file at the given absolute path. Each cue is `index`, a
`HH:MM:SS,mmm --> HH:MM:SS,mmm` timing line, then one or more text lines. Parse each cue's
start time (in seconds) and text. Assign every cue to the chunk that contains its start
time: `chunkIndex = floor(startSeconds / 5)`. A cue spanning a boundary belongs to the
chunk of its start; if multiple cues land in one chunk, concatenate their text for that
chunk's script beat.

Because the `.srt` carries real timings, do NOT assume one beat per chunk — use the cue
timings to place text precisely, and note the exact in-chunk offset (`startSeconds - 5N`)
when an overlay should be timed to a specific line.

For each chunk, decide whether an overlay edit genuinely adds appeal. Good candidates:

- a surprising statistic or key claim → emphasis text pop-in + impact SFX
- a reveal or transition moment → wipe/scale-in overlay
- a reaction beat → character (KefirCharacter / CharacterOverlay) + SpeechBubble
- data being discussed → reuse a chart from `src/components/charts/`

Chunks with no clear benefit are left **untouched** (no crop, no render).

### 3. Write `edited_script.md`

Write `edited_script.md` at the **project root** using the template in
[rules/edited-script-format.md](rules/edited-script-format.md). It must cover **every**
5s chunk (including the ones marked "no edit") so the user sees the full picture.

After writing it, briefly summarize which chunks you plan to edit and offer the user a
chance to review/adjust before you crop and render.

### 4. Crop only the edited chunks

For each chunk that gets an edit, re-encode just that segment into `public/segments/`
so it's reachable via `staticFile()`. See [rules/segment-cropping.md](rules/segment-cropping.md)
for the re-encode command (re-encoding is required to avoid frozen leading frames).

Name files `segment_<NN>.mp4` with a zero-padded chunk index (e.g. `segment_03.mp4`).

### 5. Build one overlay composition per edited chunk

Create `src/segments/Segment<NN>.tsx` and register it in `src/Root.tsx`. The base layer is
the cropped clip via `<Video>` from `@remotion/media`; overlays and timed `<Audio>` SFX
cues go on top. Use the source dimensions/fps from step 1 and
`durationInFrames = round(chunkLength * fps)`. Full recipe and SFX handling in
[rules/overlay-composition.md](rules/overlay-composition.md).

### 6. Render each edited chunk

```bash
npx remotion render Segment<NN> out/segment_<NN>_edited.mp4
```

Render only the edited chunks. Leave `src/segments/*.tsx` and the `Root.tsx` registrations
in place. These `out/segment_<NN>_edited.mp4` files are **intermediate artifacts**, not the
deliverable — they feed the assembly step below.

### 7. Assemble the final video — REQUIRED, never skip

This step is mandatory and produces the actual deliverable. Always run it — do not stop after
step 6, and do not hand-roll the cropping/concat logic in the conversation. Run it even if only
one chunk (or none) was edited, so the output is always the full-length combined video.

Run the assembly script. It probes the source for the chunk layout, uses each existing
`out/segment_<NN>_edited.mp4` where present, crops every other chunk straight from the
source with FFmpeg (no Remotion render), normalizes all chunks to one codec spec, and
joins them in order with the FFmpeg concat filter (re-encoding one continuous timeline,
so there's no pause at the edited/unedited seams) into `out/final.mp4`:

```bash
node .claude/skills/remotion-segment-editor/scripts/assemble-video.mjs "<absolute-path-to-source-video>"
```

Flags: `--chunk <sec>` (default 5, must match the layout used above), `--out <dir>`
(default `out`), `--final <path>` (default `out/final.mp4`), `--keep-temp` to keep the
normalized intermediates. Run this as a tool — do **not** reproduce its cropping/concat
logic by hand in the conversation.

### 8. Report back

List each `out/segment_<NN>_edited.mp4` with the original timestamp range it replaces
(e.g. "Segment 03 → replaces 00:15–00:20"), and point the user at the assembled
`out/final.mp4`.

## Verification

- `npx remotion ffprobe public/segments/segment_<NN>.mp4` → duration ≈ chunk length, dimensions match source.
- Preview in Studio: `npm run dev`, open `Segment<NN>`, scrub to confirm footage + overlays + SFX.
- One-frame check: `npx remotion still Segment<NN> --frame=<mid> --scale=0.5`.
- Confirm `edited_script.md` covers every chunk and only flagged chunks produced outputs.
- **Required gate before reporting done:** confirm `out/final.mp4` exists and
  `npx remotion ffprobe out/final.mp4` reports a duration ≈ the source duration (not just the
  sum of the edited chunks). If it is missing or short, the assembly step did not run correctly —
  do not report the task complete until the full-length video exists. Also scrub the seams around
  edited chunks to confirm clean splices.
