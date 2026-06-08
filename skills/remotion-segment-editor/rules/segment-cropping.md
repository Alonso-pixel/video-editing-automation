---
name: segment-cropping
description: FFmpeg/FFprobe recipes for probing the source video and cropping only the chunks that get edits.
metadata:
  tags: ffmpeg, ffprobe, crop, trimming
---

## FFmpeg/FFprobe access

`ffmpeg` and `ffprobe` ship with Remotion — no separate install. Invoke them via:

```bash
npx remotion ffmpeg ...
npx remotion ffprobe ...
```

## Probe the source

Get everything in one structured call:

```bash
npx remotion ffprobe -v error -select_streams v:0 \
  -show_entries stream=width,height,r_frame_rate,duration \
  -show_entries format=duration -of default=noprint_wrappers=1 "<absolute-path>"
```

- `width` / `height` → composition dimensions (match the footage exactly).
- `r_frame_rate` is a fraction like `30/1` or `30000/1001`; divide to get fps. Round to the
  nearest standard rate (30, 25, 24, 60) for the composition `fps`.
- `duration` (prefer `format=duration`) → total seconds.

Compute chunks:
- `chunkCount = ceil(duration / 5)`
- Chunk `N` (0-based): `start = 5N`, `end = min(5N + 5, duration)`, `length = end - start`.
- The final chunk is usually shorter than 5s — use its real `length`.

## Crop a single edited chunk

Re-encode just the segment (re-encoding avoids frozen/duplicated leading frames that
stream-copy `-c copy` produces when cutting mid-GOP):

```bash
npx remotion ffmpeg -ss <start> -i "<absolute-path>" -t <length> \
  -c:v libx264 -c:a aac -pix_fmt yuv420p public/segments/segment_<NN>.mp4
```

- **Use `-t <length>` (clip duration), NOT `-to <end>`.** With input seeking (`-ss` placed
  *before* `-i`), the `-to` value is measured against the **original** timeline, so
  `-ss 20 -to 25` yields a 25s clip, not 5s. `-t` is the duration after the seek and is
  unambiguous. `<length>` is the chunk length (`5`, or the real length for the final chunk).
- `<start>` is seconds from the source start (decimals fine, e.g. `15`, `60`).
- `<NN>` is the zero-padded 0-based chunk index (`00`, `01`, …).
- Output under `public/segments/` so the clip resolves with
  `staticFile("segments/segment_<NN>.mp4")`.
- `-pix_fmt yuv420p` keeps the output broadly compatible.
- Create `public/segments/` first if it does not exist.

Only crop chunks that will actually be edited into `public/segments/` (these become the
base layer of the overlay compositions). The *unedited* chunks are not cropped here — the
assembly script (step 7) crops them straight from the source at concat time.

## Final assembly (step 7)

`scripts/assemble-video.mjs` rebuilds the whole timeline without re-rendering: it probes
the source, reuses each `out/segment_<NN>_edited.mp4`, crops every other chunk directly
from the source with the same `-ss <start> -i ... -t <length>` trim, normalizes all chunks
to one codec spec (libx264 / yuv420p / aac 48k stereo at the source fps), and stream-copy
concatenates them in order into `out/final.mp4`. Run it as a tool, e.g.:

```bash
node .claude/skills/remotion-segment-editor/scripts/assemble-video.mjs "<absolute-source>"
```

## Verify a crop

```bash
npx remotion ffprobe -v error -show_entries format=duration \
  -of default=noprint_wrappers=1:nokey=1 public/segments/segment_<NN>.mp4
```

Duration should be within a frame or two of the expected chunk `length`.
