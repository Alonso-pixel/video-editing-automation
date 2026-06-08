# AGENTS.md — instructions for Jules (and any coding agent) on this repo

This repo turns a **source video** (e.g. Veo footage where every scene is ~5 seconds) into
an edited video by layering Remotion animations + sound effects onto **specific 5-second
chunks**, then stitching the edited chunks back together with the untouched original chunks
into one full-length `out/final.mp4` — **the whole video is never re-rendered**.

You (Jules) run in one of **two modes**, decided by the prompt you were given:

- **EDIT mode** — plan and build the overlays, open a Pull Request. **Do NOT render.**
- **RENDER mode** — on a merged PR, render the edited chunks and assemble the final video,
  then upload it to Google Cloud Storage.

The prompt will say which mode. If it is ambiguous, default to EDIT mode and ask.

This is a port of the Claude Code skill at `.claude/skills/remotion-segment-editor/`. That
skill is **not** loaded for you, but its rule docs are still the source of truth for details —
read them as needed:
- `.claude/skills/remotion-segment-editor/rules/edited-script-format.md` — `edited_script.md` template
- `.claude/skills/remotion-segment-editor/rules/segment-cropping.md` — FFmpeg/FFprobe crop recipes
- `.claude/skills/remotion-segment-editor/rules/overlay-composition.md` — composition + SFX recipe

---

## Project facts

- Remotion 4.0.462, React 19, Tailwind v4. Node scripts are ESM (`.mjs`).
- Compositions are registered in `src/Root.tsx`; each overlay lives in `src/segments/Segment<NN>.tsx`.
- Reusable overlay primitives: `src/segments/overlay-kit.tsx` (`PopIn`, `Sfx`, `useDissolve`,
  `useShake`, `cardStyle`) and `src/styles.ts` (`FPS`, `COLORS`, `FONTS`). Reuse these.
- Cropped base clips live in `public/segments/segment_<NN>.mp4` (reachable via `staticFile()`).
- FFmpeg/FFprobe ship with Remotion — call them via `npx remotion ffmpeg` / `npx remotion ffprobe`
  (no separate install needed).
- The deterministic scripts you will call:
  - `node scripts/render-and-assemble.mjs <source>` — RENDER mode entrypoint (renders every
    registered `Segment<NN>` then assembles). Also exposed as `npm run render:all -- <source>`.
  - `.claude/skills/remotion-segment-editor/scripts/assemble-video.mjs` — the stitch step
    (called for you by the script above; do not hand-roll its concat logic).

---

## Hard rules (apply in BOTH modes)

- **Never re-render the whole video.** Only crop and render the chunks that get edits.
- **Overlay, don't replace.** The cropped original clip plays as the base `<Video>` layer;
  animations and SFX are layered on top.
- **Match the footage.** Composition `width`/`height`/`fps` come from probing the source,
  not assumed. Do **not** hardcode 1080×1920.
- **Animate the Remotion way only:** `useCurrentFrame()` / `interpolate()` / `spring()`.
  CSS transitions/animations and Tailwind animation classes are FORBIDDEN — they don't render.
- **Dissolve overlays before the cut.** Every overlay must animate OUT and be fully gone by the
  last frame of its chunk, so the edited clip ends on clean original footage (seamless splice).
- **Leave the comps in place** after rendering so a human can tweak them.
- **Secrets:** never commit credentials. GCS access comes from the `GCP_SA_KEY` environment
  secret (configured in the Jules environment), activated by `jules-setup.sh`.

---

## EDIT mode

You were given: a source video **`gs://` URI** and a free-text **brief** describing the desired
edits (and optionally an `.srt`). Goal: produce a PR with the planning doc, cropped chunks, and
overlay compositions. **Do not render. Do not run `scripts/render-and-assemble.mjs`.**

1. **Fetch the source from GCS** into a local working path:
   ```bash
   mkdir -p .work
   gsutil cp "<gs-source-uri>" .work/source.mp4
   ```
   (Auth is already set up by `jules-setup.sh`. The brief text is in the prompt; if an `.srt`
   sidecar URI was provided, `gsutil cp` it too.)

2. **Probe** the source and compute the chunk layout:
   - `npx remotion ffprobe ".work/source.mp4"` → read `duration`, `width`, `height`, `fps`.
   - `chunkCount = ceil(duration / 5)`; chunk `N` covers `[5N, min(5N+5, duration))`;
     the **final chunk may be shorter than 5s** — use its real length.

3. **Decide what to edit** from the brief (and `.srt` cue timings if present). Good candidates:
   a surprising stat → emphasis pop-in + impact SFX; a reveal → wipe/scale-in; a reaction beat →
   character + speech bubble. Chunks with no clear benefit stay **untouched** (no crop, no render).

4. **Write `edited_script.md`** at the repo root covering **every** chunk (including "no edit"
   ones), per `rules/edited-script-format.md`.

5. **Crop only the edited chunks** into `public/segments/segment_<NN>.mp4` (zero-padded index),
   re-encoding per `rules/segment-cropping.md` (re-encode is required — avoids frozen lead frames).

6. **Build one overlay composition per edited chunk**: `src/segments/Segment<NN>.tsx`, base layer
   = the cropped clip via `<Video>` from `@remotion/media`, overlays + timed `<Audio>` SFX on top,
   `durationInFrames = round(chunkLength * fps)`. Register each in `src/Root.tsx`. Reuse
   `overlay-kit.tsx` primitives. Recipe in `rules/overlay-composition.md`.

7. **Open a Pull Request** (the API runs you with `automationMode: AUTO_CREATE_PR`). The PR must:
   - include `edited_script.md`, the new `public/segments/*.mp4`, `src/segments/Segment<NN>.tsx`,
     and the `src/Root.tsx` registration;
   - **carry the source `gs://` URI in the PR body** on a line exactly like:
     `Source: gs://bucket/path/to/source.mp4`
     (the render workflow parses this line to know what to render against);
   - NOT include anything under `out/` (renders happen in RENDER mode).

   **Do not render in EDIT mode.** Stop after opening the PR.

---

## RENDER mode

You were given: confirmation that an edit PR was **merged to main**, and the source `gs://` URI
(extracted from the PR body's `Source:` line). Goal: render and deliver the full-length video.

1. **Fetch the same source from GCS** (the assembler crops the *unedited* chunks straight from it):
   ```bash
   mkdir -p .work
   gsutil cp "<gs-source-uri>" .work/source.mp4
   ```

2. **Render + assemble** with the deterministic script — it renders every registered
   `Segment<NN>` to `out/segment_<NN>_edited.mp4`, then stitches edited + untouched chunks into
   `out/final.mp4`:
   ```bash
   node scripts/render-and-assemble.mjs .work/source.mp4
   ```

3. **Verify** the deliverable before uploading:
   - `out/final.mp4` exists and `npx remotion ffprobe out/final.mp4` reports a duration ≈ the
     **source** duration (not just the sum of edited chunks). If it is short, the assembly did
     not run correctly — fix before uploading.

4. **Upload to the rendered bucket**, preserving the source name:
   ```bash
   gsutil cp out/final.mp4 "gs://<RENDERED_BUCKET>/<source-stem>/final.mp4"
   ```
   `<RENDERED_BUCKET>` and `<source-stem>` come from the prompt. Report the resulting `gs://` URL.

5. Do **not** commit `out/` artifacts (they are gitignored). Leave `src/segments/*` in place.
