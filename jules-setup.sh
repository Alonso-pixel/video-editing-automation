#!/usr/bin/env bash
# Jules VM bootstrap. Point the Jules environment (repo settings in the Jules dashboard)
# at this script so it runs once when the VM is provisioned, for BOTH edit and render runs.
#
# It installs project deps and authenticates gcloud/gsutil to GCS using the GCP_SA_KEY
# environment secret. Keep this lightweight: EDIT sessions must not wait on render-only
# browser downloads before Jules can plan and open a PR.
set -euo pipefail

echo "==> jules-setup: installing project dependencies"
npm ci --no-audit --no-fund

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
