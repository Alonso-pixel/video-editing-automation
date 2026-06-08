#!/usr/bin/env node
// Deterministic "render session" entrypoint used by the Jules render run (and
// reproducible locally). It does exactly what steps 6+7 of the segment-editor
// workflow do, with no human in the loop:
//
//   1. Discover every registered overlay composition by globbing src/segments/Segment*.tsx.
//   2. `npx remotion render Segment<NN> out/segment_<NN>_edited.mp4` for each (only the
//      edited chunks — the whole video is never re-rendered).
//   3. `node .claude/skills/remotion-segment-editor/scripts/assemble-video.mjs <source>`
//      to stitch edited + untouched chunks into a full-length out/final.mp4.
//
// Usage:
//   node scripts/render-and-assemble.mjs <source-video> [--chunk 5] [--final out/final.mp4]
//
// The source video is required because the assembler crops the *unedited* chunks
// straight from it. In the Jules render session, fetch it from GCS first (see AGENTS.md).

import { spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");
const segmentsDir = join(projectRoot, "src", "segments");
const assembleScript = join(
  projectRoot,
  ".claude",
  "skills",
  "remotion-segment-editor",
  "scripts",
  "assemble-video.mjs"
);

function parseArgs(argv) {
  const args = { source: null, passthrough: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--chunk" || a === "--final" || a === "--out") {
      args.passthrough.push(a, argv[++i]);
    } else if (a === "--keep-temp") {
      args.passthrough.push(a);
    } else if (!args.source) {
      args.source = a;
    } else {
      throw new Error(`Unexpected argument: ${a}`);
    }
  }
  if (!args.source) throw new Error("Source video path is required.");
  return args;
}

// Quote args for shell:true execution (needed for the npx/node .cmd shims on Windows).
const quote = (s) => `"${String(s).replace(/"/g, '\\"')}"`;

function run(cmd, cmdArgs) {
  const line = `${cmd} ${cmdArgs.map(quote).join(" ")}`;
  console.log(`$ ${line}`);
  const res = spawnSync(line, { shell: true, stdio: "inherit" });
  if (res.error) throw res.error;
  if (res.status !== 0) throw new Error(`Command failed (${res.status}): ${line}`);
}

// Each composition id matches its filename: Segment<NN>.tsx -> "Segment<NN>".
function discoverSegmentIds() {
  if (!existsSync(segmentsDir)) return [];
  return readdirSync(segmentsDir)
    .filter((f) => /^Segment\d+\.tsx$/.test(f))
    .map((f) => f.replace(/\.tsx$/, ""))
    .sort();
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const source = resolve(args.source);
  if (!existsSync(source)) throw new Error(`Source video not found: ${source}`);
  if (!existsSync(assembleScript))
    throw new Error(`Assembler not found: ${assembleScript}`);

  const ids = discoverSegmentIds();
  if (ids.length === 0) {
    console.log(
      "No src/segments/Segment*.tsx found — nothing to render. " +
        "The assembler will still crop the full source into out/final.mp4."
    );
  }

  for (const id of ids) {
    const nn = id.replace("Segment", "");
    const outFile = join("out", `segment_${nn}_edited.mp4`);
    run("npx", ["remotion", "render", id, outFile]);
  }

  run("node", [assembleScript, source, ...args.passthrough]);
  console.log(`\nDone. Rendered ${ids.length} edited chunk(s) → out/final.mp4`);
}

try {
  main();
} catch (err) {
  console.error(`render-and-assemble: ${err.message}`);
  process.exit(1);
}
