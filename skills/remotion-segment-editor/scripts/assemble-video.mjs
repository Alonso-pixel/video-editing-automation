#!/usr/bin/env node
// Assemble the final video from edited (Remotion-rendered) chunks + unedited
// chunks cropped straight from the source. The whole video is NEVER re-rendered:
// edited chunks come from out/segment_<NN>_edited.mp4, every other chunk is a fast
// FFmpeg trim of the source. All chunks are normalized to one codec spec, then
// joined with the FFmpeg concat FILTER (decode + re-encode one continuous timeline)
// into out/final.mp4 — this rebuilds PTS across boundaries so there is no small pause
// at the edited/unedited seams that stream-copy concat would leave behind.
//
// Usage:
//   node assemble-video.mjs <source-video> [--chunk 5] [--out out] [--final out/final.mp4]
//
// Flags:
//   --chunk <sec>    chunk length in seconds (default 5; must match the editor skill)
//   --out <dir>      directory holding segment_<NN>_edited.mp4 and where crops/final land (default: out)
//   --final <path>   final output path (default: <out>/final.mp4)
//   --keep-temp      keep the normalized intermediates (default: deleted)

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { join, resolve, isAbsolute } from "node:path";

function parseArgs(argv) {
  const args = { chunk: 5, out: "out", final: null, keepTemp: false, source: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--chunk") args.chunk = Number(argv[++i]);
    else if (a === "--out") args.out = argv[++i];
    else if (a === "--final") args.final = argv[++i];
    else if (a === "--keep-temp") args.keepTemp = true;
    else if (!args.source) args.source = a;
    else throw new Error(`Unexpected argument: ${a}`);
  }
  if (!args.source) throw new Error("Source video path is required.");
  return args;
}

// FFmpeg/FFprobe ship with Remotion. Use the npx wrappers so no separate install is needed.
const NPX = "npx";

// Quote an argument for execution through a shell (needed because Windows .cmd
// shims only run with shell:true). Wrap in double quotes and escape inner ones.
function shellQuote(arg) {
  return `"${String(arg).replace(/"/g, '\\"')}"`;
}

function run(toolArgs, { capture = false } = {}) {
  // Leave the executable name unquoted so the shell resolves the right launcher
  // (on Windows, quoting "npx" makes cmd.exe pick the extensionless shim and fail);
  // quote only the arguments, which may contain spaces.
  const cmd = `${NPX} ${toolArgs.map(shellQuote).join(" ")}`;
  const res = spawnSync(cmd, {
    shell: true,
    encoding: "utf8",
    stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
  });
  if (res.error) throw res.error;
  if (res.status !== 0) {
    const msg = capture ? `${res.stdout || ""}${res.stderr || ""}` : "";
    throw new Error(`Command failed (${cmd}): ${msg}`.trim());
  }
  return res.stdout;
}

function probe(source) {
  const out = run(
    [
      "remotion",
      "ffprobe",
      "-v",
      "error",
      "-select_streams",
      "v:0",
      "-show_entries",
      "stream=r_frame_rate",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1",
      source,
    ],
    { capture: true }
  );
  const get = (key) => {
    const m = out.match(new RegExp(`${key}=(.+)`));
    return m ? m[1].trim() : null;
  };
  const duration = Number(get("duration"));
  const rate = get("r_frame_rate") || "30/1";
  const [num, den] = rate.split("/").map(Number);
  const rawFps = den ? num / den : Number(rate);
  // Round to the nearest standard rate for a clean, uniform timeline.
  const fps = [24, 25, 30, 50, 60].reduce((best, r) =>
    Math.abs(r - rawFps) < Math.abs(best - rawFps) ? r : best
  );
  if (!Number.isFinite(duration) || duration <= 0)
    throw new Error(`Could not read a valid duration from ${source}`);
  return { duration, fps };
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const source = isAbsolute(args.source) ? args.source : resolve(args.source);
  if (!existsSync(source)) throw new Error(`Source video not found: ${source}`);

  const outDir = resolve(args.out);
  const tmpDir = join(outDir, ".assemble-tmp");
  const finalPath = args.final ? resolve(args.final) : join(outDir, "final.mp4");
  mkdirSync(outDir, { recursive: true });
  mkdirSync(tmpDir, { recursive: true });

  const { duration, fps } = probe(source);
  const chunkCount = Math.ceil(duration / args.chunk);
  console.log(
    `Source: ${source}\n  duration=${duration.toFixed(3)}s fps=${fps} → ${chunkCount} chunk(s) of ${args.chunk}s`
  );

  // Normalize every piece to one spec (resolution / pixel format / fps / sample rate)
  // so the concat filter can join them without per-input scaling or resampling.
  const norm = (input, dest) =>
    run([
      "remotion",
      "ffmpeg",
      "-y",
      "-i",
      input,
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "18",
      "-pix_fmt",
      "yuv420p",
      "-r",
      String(fps),
      "-c:a",
      "aac",
      "-ar",
      "48000",
      "-ac",
      "2",
      dest,
    ]);

  const pieces = [];
  for (let n = 0; n < chunkCount; n++) {
    const start = n * args.chunk;
    const length = Math.min(args.chunk, duration - start);
    const edited = join(outDir, `segment_${pad(n)}_edited.mp4`);
    const normalized = join(tmpDir, `chunk_${pad(n)}.mp4`);

    if (existsSync(edited)) {
      console.log(`  chunk ${pad(n)}: edited render`);
      norm(edited, normalized);
    } else {
      console.log(
        `  chunk ${pad(n)}: crop source [${start.toFixed(2)}s, +${length.toFixed(2)}s)`
      );
      // -ss before -i = input seek; -t = clip duration after the seek (never -to).
      run([
        "remotion",
        "ffmpeg",
        "-y",
        "-ss",
        String(start),
        "-i",
        source,
        "-t",
        String(length),
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "18",
        "-pix_fmt",
        "yuv420p",
        "-r",
        String(fps),
        "-c:a",
        "aac",
        "-ar",
        "48000",
        "-ac",
        "2",
        normalized,
      ]);
    }
    pieces.push(normalized);
  }

  // Concat FILTER over the (already uniform) pieces: decode everything and
  // re-encode one continuous timeline. This rebuilds PTS across boundaries so the
  // per-file edit lists / audio priming samples of stream-copy concat — the source
  // of the small pause at every edited/unedited seam — are gone.
  console.log(`Concatenating ${pieces.length} chunk(s) → ${finalPath}`);
  const inputArgs = pieces.flatMap((p) => ["-i", p]);
  const filter =
    pieces.map((_, i) => `[${i}:v:0][${i}:a:0]`).join("") +
    `concat=n=${pieces.length}:v=1:a=1[outv][outa]`;
  run([
    "remotion",
    "ffmpeg",
    "-y",
    ...inputArgs,
    "-filter_complex",
    filter,
    "-map",
    "[outv]",
    "-map",
    "[outa]",
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "18",
    "-pix_fmt",
    "yuv420p",
    "-r",
    String(fps),
    "-c:a",
    "aac",
    "-ar",
    "48000",
    "-ac",
    "2",
    finalPath,
  ]);

  if (!args.keepTemp) rmSync(tmpDir, { recursive: true, force: true });
  console.log(`Done: ${finalPath}`);
}

try {
  main();
} catch (err) {
  console.error(`assemble-video: ${err.message}`);
  process.exit(1);
}
