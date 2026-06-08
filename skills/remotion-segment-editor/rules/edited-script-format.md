---
name: edited-script-format
description: The exact template for the edited_script.md planning document.
metadata:
  tags: remotion, planning, script
---

## Purpose

`edited_script.md` is the planning doc written at the project root **before** any cropping
or rendering. It maps every 5-second chunk of the source video to the animation + SFX edits
that will be layered on top. The script beats come from the cues of the provided `.srt`
file, assigned to chunks by their start time (`chunkIndex = floor(startSeconds / 5)`).
It is the contract the user reviews before work proceeds.

## Rules

- Cover **every** chunk, including ones with no edit (mark them `— no edit —`).
- Fill each chunk's "Script beat" from the `.srt` cue(s) whose start time falls in that
  chunk (`floor(startSeconds / 5) == chunkIndex`); concatenate text if several cues land in
  one chunk, and leave it blank if no cue does.
- Time ranges use `mm:ss–mm:ss`. Chunk `N` (0-based) = `[5N, min(5N+5, duration))`.
- The final row may be shorter than 5s; show its true range.
- For animation, name **specific existing components** from `src/components/` where they fit
  (e.g. `SpeechBubble`, `KefirCharacter`, `charts/MicrobialBarChart`). Only describe a new
  component when nothing existing applies, and prefix it with `NEW:`.
- For SFX, name a **specific file** from `src/sound-effects/` (e.g. `tense_sound.mp3`), or
  `—` if none. If the desired effect has no matching file, write `NEEDS SFX: <description>`.
- Keep the rationale to one line — *why* this edit makes the moment more appealing.

## Template

```markdown
# Edited Script — <source video filename>

- **Source:** `<absolute path>`
- **Duration:** `<mm:ss>` (`<seconds>`s) · **Dimensions:** `<W>×<H>` · **FPS:** `<fps>`
- **Chunks:** `<count>` × 5s (final chunk `<len>`s)
- **Chunks to edit:** `<list of indices>`

## Per-chunk plan

| #  | Time          | Script beat                          | Animation (overlay)                          | SFX               | Rationale                          |
|----|---------------|--------------------------------------|----------------------------------------------|-------------------|------------------------------------|
| 00 | 00:00–00:05   | "<excerpt>"                          | SpeechBubble + KefirCharacter (excited)      | tense_sound.mp3   | Hook the viewer on the opening line |
| 01 | 00:05–00:10   | "<excerpt>"                          | — no edit —                                  | —                 | Footage is strong as-is            |
| 02 | 00:10–00:15   | "<excerpt>"                          | NEW: stat counter pop-in                     | NEEDS SFX: ding   | Emphasize the key statistic        |
| …  |               |                                      |                                              |                   |                                    |

## Output mapping (filled after render)

| #  | Edited file                         | Replaces      |
|----|-------------------------------------|---------------|
| 00 | `out/segment_00_edited.mp4`         | 00:00–00:05   |
| 02 | `out/segment_02_edited.mp4`         | 00:10–00:15   |
```
