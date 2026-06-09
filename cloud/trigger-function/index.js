/**
 * GCS upload -> Jules EDIT session.
 *
 * Eventarc fires this (Gen2) Cloud Function on `google.cloud.storage.object.v1.finalized`
 * for the source-videos bucket. For each newly uploaded *.mp4 it:
 *   1. reads the per-video brief (sidecar `<name>.brief.txt`, or the object's `brief` metadata),
 *   2. POSTs a Jules session against the GitHub repo with automationMode AUTO_CREATE_PR and a
 *      prompt that tells Jules to follow AGENTS.md EDIT mode (and NOT render).
 *
 * Re-entrancy guards: ignores non-mp4 objects, `.brief.txt` sidecars, and anything that is not
 * a fresh upload. Renders never land here (they go to a separate rendered-videos bucket).
 *
 * Env vars (set at deploy):
 *   JULES_API_KEY   - injected from Secret Manager (do NOT hardcode)
 *   JULES_REPO      - e.g. "sources/github/<owner>/videos-remotion-veo"
 *   STARTING_BRANCH - default "main"
 *   RENDERED_BUCKET - name of the output bucket (passed through to Jules for RENDER mode later)
 */

const { Storage } = require("@google-cloud/storage");

const JULES_SESSIONS_URL = "https://jules.googleapis.com/v1alpha/sessions";
const storage = new Storage();

function required(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

/** Read the brief: prefer the sidecar `<stem>.brief.txt`, else the object's `brief` metadata. */
async function readBrief(bucketName, objectName, objectMetadata) {
  const stem = objectName.replace(/\.[^/.]+$/, "");
  const sidecar = `${stem}.brief.txt`;
  try {
    const [buf] = await storage.bucket(bucketName).file(sidecar).download();
    const text = buf.toString("utf8").trim();
    if (text) return text;
  } catch {
    // no sidecar — fall through to metadata
  }
  const fromMeta = objectMetadata && objectMetadata.brief;
  return (fromMeta && String(fromMeta).trim()) || "";
}

function buildPrompt({ gsUri, brief, renderedBucket }) {
  const stem = gsUri.split("/").pop().replace(/\.[^/.]+$/, "");
  return [
    "Run in EDIT mode per AGENTS.md (the segment-editor workflow). DO NOT RENDER.",
    "",
    `Source video: ${gsUri}`,
    `Output (for the later RENDER session): gs://${renderedBucket}/${stem}/final.mp4`,
    "",
    "Editing brief from the uploader:",
    brief || "(no brief provided — use good editorial judgement per AGENTS.md)",
    "",
    "Steps: gsutil cp the source locally, probe it, plan edits in edited_script.md (cover every",
    "5s chunk), crop only the edited chunks into public/segments/, build one Segment<NN>.tsx",
    "overlay per edited chunk and register it in src/Root.tsx, then OPEN A PULL REQUEST.",
    "Use source-specific overlay copy only; do not use generic labels like 'Dato Sorprendente'.",
    "Do not delete shared project files. Only clean stale Segment<NN> and public/segments artifacts",
    "if they would be rendered by mistake for this current source.",
    `Include this exact line in the PR body so the render workflow can find it: "Source: ${gsUri}"`,
    "Do not put anything under out/ in the PR. Do not render — stop after opening the PR.",
  ].join("\n");
}

async function startJulesSession(prompt) {
  const res = await fetch(JULES_SESSIONS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": required("JULES_API_KEY"),
    },
    body: JSON.stringify({
      prompt,
      automationMode: "AUTO_CREATE_PR",
      sourceContext: {
        source: required("JULES_REPO"),
        githubRepoContext: {
          startingBranch: process.env.STARTING_BRANCH || "main",
        },
      },
    }),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Jules API ${res.status}: ${text}`);
  }
  return text;
}

/**
 * CloudEvent handler. Registered as the function entrypoint `onSourceVideo`.
 * @param {{data: {bucket: string, name: string, contentType?: string, metadata?: object}}} cloudEvent
 */
exports.onSourceVideo = async (cloudEvent) => {
  const obj =
    cloudEvent && cloudEvent.data && cloudEvent.data.name
      ? cloudEvent.data
      : cloudEvent;
  if (!obj || !obj.name) {
    console.log("No object in event — ignoring.");
    return;
  }
  const { bucket, name } = obj;

  // Guards: only act on real video uploads.
  if (name.endsWith(".brief.txt")) {
    console.log(`Skipping brief sidecar: ${name}`);
    return;
  }
  const isVideo =
    /\.(mp4|mov|m4v|webm)$/i.test(name) ||
    (obj.contentType || "").startsWith("video/");
  if (!isVideo) {
    console.log(`Skipping non-video object: ${name} (${obj.contentType || "?"})`);
    return;
  }

  const gsUri = `gs://${bucket}/${name}`;
  const renderedBucket = required("RENDERED_BUCKET");
  const brief = await readBrief(bucket, name, obj.metadata);

  console.log(`New source video ${gsUri} — starting Jules EDIT session.`);
  const result = await startJulesSession(buildPrompt({ gsUri, brief, renderedBucket }));
  console.log(`Jules session created: ${result}`);
};
