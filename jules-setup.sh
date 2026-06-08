#!/usr/bin/env bash
# Jules VM bootstrap. Point the Jules environment (repo settings in the Jules dashboard)
# at this script so it runs once when the VM is provisioned, for BOTH edit and render runs.
#
# It installs project deps, ensures the tools Remotion needs to render headlessly, and
# authenticates gcloud/gsutil to GCS using the GCP_SA_KEY environment secret.
set -euo pipefail

echo "==> jules-setup: installing project dependencies"
npm ci

# FFmpeg/FFprobe ship inside Remotion, but the renderer also needs a headless Chrome.
# Ensure the Chrome Headless Shell is present so `remotion render` doesn't stall on download.
echo "==> jules-setup: ensuring Remotion's headless browser"
npx remotion browser ensure || npx remotion browser ensure --log=verbose

# System ffmpeg as a belt-and-braces fallback (no-op if already present / not permitted).
if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "==> jules-setup: installing system ffmpeg"
  (sudo apt-get update -y && sudo apt-get install -y ffmpeg) || \
    echo "   (could not apt-get ffmpeg; relying on Remotion's bundled ffmpeg)"
fi

# Authenticate to GCS. GCP_SA_KEY is a Jules environment secret holding the service-account
# JSON (storage.objectAdmin on the source + rendered buckets). Write it to a file and activate.
if [ -n "${GCP_SA_KEY:-}" ]; then
  echo "==> jules-setup: activating GCS service account"
  printf '%s' "$GCP_SA_KEY" > /tmp/gcp-sa-key.json
  export GOOGLE_APPLICATION_CREDENTIALS=/tmp/gcp-sa-key.json
  gcloud auth activate-service-account --key-file=/tmp/gcp-sa-key.json
else
  echo "   WARNING: GCP_SA_KEY not set — gsutil cp to/from GCS will fail."
fi

echo "==> jules-setup: done"
