# Jules + GCS render pipeline — setup

This wires the repo so that **uploading a video to a GCS bucket** drives Google's **Jules**
agent to edit it (open a PR), and **merging that PR** drives a second Jules run that renders
the final video on Google compute and uploads it back to GCS.

```
upload video+brief → GCS source bucket → Cloud Function → Jules EDIT session → PR
       you review + merge PR → GitHub Action → Jules RENDER session → final.mp4 → GCS rendered bucket
```

Pieces in this repo:
- `AGENTS.md` — the workflow Jules follows (EDIT mode and RENDER mode).
- `jules-setup.sh` — Jules VM bootstrap (deps, headless Chrome, GCS auth).
- `scripts/render-and-assemble.mjs` — deterministic render+assemble used by RENDER mode.
- `cloud/trigger-function/` — the GCS→Jules Cloud Function.
- `.github/workflows/jules-render.yml` — the PR-merge→Jules render trigger.

> **Render runs inside the ephemeral Jules VM** (your chosen option). It renders only the few
> edited 5s chunks, so it stays light. If a render ever times out, swap Stage 4 for a Cloud Run
> Job running the same `scripts/render-and-assemble.mjs` (see *Fallback* at the bottom) — no
> code changes, just a different runner.

---

## 0. Prerequisites

- A GCP project (`PROJECT_ID`) with billing enabled.
- `gcloud` CLI authenticated as an owner/editor.
- A **Jules API key** (Jules dashboard → API) and the GitHub repo **connected to Jules**.
- Your repo's Jules source string, e.g. `sources/github/<owner>/videos-remotion-veo`.

Set some shell vars used below:
```bash
export PROJECT_ID="my-project"
export REGION="us-central1"
export SRC_BUCKET="${PROJECT_ID}-source-videos"
export OUT_BUCKET="${PROJECT_ID}-rendered-videos"
export JULES_REPO="sources/github/<owner>/videos-remotion-veo"
gcloud config set project "$PROJECT_ID"
```

## 1. Buckets

```bash
gcloud storage buckets create "gs://${SRC_BUCKET}" --location="$REGION"
gcloud storage buckets create "gs://${OUT_BUCKET}" --location="$REGION"
```

## 2. Service account for GCS access (used inside the Jules VM)

```bash
gcloud iam service-accounts create remotion-renderer \
  --display-name="Remotion renderer (Jules VM GCS access)"
SA="remotion-renderer@${PROJECT_ID}.iam.gserviceaccount.com"

# Scope storage admin to just the two buckets.
for B in "$SRC_BUCKET" "$OUT_BUCKET"; do
  gcloud storage buckets add-iam-policy-binding "gs://${B}" \
    --member="serviceAccount:${SA}" --role="roles/storage.objectAdmin"
done

# Export a key — this JSON becomes the Jules env secret GCP_SA_KEY (step 5).
gcloud iam service-accounts keys create ./gcp-sa-key.json --iam-account="$SA"
```

## 3. Store the Jules API key in Secret Manager (for the Cloud Function)

```bash
gcloud services enable secretmanager.googleapis.com
printf '%s' "<YOUR_JULES_API_KEY>" | \
  gcloud secrets create jules-api-key --data-file=- --replication-policy=automatic
```

## 4. Deploy the Cloud Function (GCS upload → Jules EDIT session)

```bash
gcloud services enable cloudfunctions.googleapis.com run.googleapis.com eventarc.googleapis.com

gcloud functions deploy jules-source-trigger \
  --gen2 --runtime=nodejs22 --region="$REGION" \
  --source=./cloud/trigger-function \
  --entry-point=onSourceVideo \
  --trigger-event-filters="type=google.cloud.storage.object.v1.finalized" \
  --trigger-event-filters="bucket=${SRC_BUCKET}" \
  --set-env-vars="JULES_REPO=${JULES_REPO},STARTING_BRANCH=main,RENDERED_BUCKET=${OUT_BUCKET}" \
  --set-secrets="JULES_API_KEY=jules-api-key:latest"
```

Grant the function's runtime service account access to the secret if prompted:
```bash
gcloud secrets add-iam-policy-binding jules-api-key \
  --member="serviceAccount:$(gcloud functions describe jules-source-trigger --gen2 --region=$REGION --format='value(serviceConfig.serviceAccountEmail)')" \
  --role="roles/secretmanager.secretAccessor"
```

## 5. Configure the Jules environment (Jules dashboard, per repo)

- **Setup script:** point it at `jules-setup.sh` (or paste its contents).
- **Secret `GCP_SA_KEY`:** paste the full contents of `./gcp-sa-key.json` from step 2.
- Confirm the repo is connected so API sessions can target `${JULES_REPO}`.

> Delete the local `./gcp-sa-key.json` after pasting it. Never commit it.

## 6. Configure GitHub (for the render trigger)

In the GitHub repo settings:
- **Secret** `JULES_API_KEY` = your Jules API key.
- **Variables** `JULES_REPO` = `${JULES_REPO}`, `RENDERED_BUCKET` = `${OUT_BUCKET}`.

`.github/workflows/jules-render.yml` already reads these.

---

## Using it

```bash
# Optional brief sidecar (else put the brief in object metadata `brief`):
echo "Punch up the stat at 00:15 and add a reaction beat near the reveal." > clip.brief.txt
gcloud storage cp clip.brief.txt "gs://${SRC_BUCKET}/clip.brief.txt"
gcloud storage cp clip.mp4         "gs://${SRC_BUCKET}/clip.mp4"
```

Jules opens an EDIT PR. Review `edited_script.md` + the Segment comps, then **merge** → the
render workflow fires → `gs://${OUT_BUCKET}/clip/final.mp4` appears.

Manual render (skip the PR flow):
```bash
gh workflow run jules-render.yml -f source_uri="gs://${SRC_BUCKET}/clip.mp4"
```

---

## Fallback: render on a Cloud Run Job instead of the Jules VM

If renders outgrow the Jules VM, containerize the repo (`node:20` + `npx remotion browser
ensure`) and run the **same** entrypoint as a Cloud Run Job:

```
ENTRYPOINT: gsutil cp $SOURCE_URI /work/source.mp4
            && node scripts/render-and-assemble.mjs /work/source.mp4
            && gsutil cp out/final.mp4 gs://$OUT_BUCKET/$STEM/final.mp4
```

Then point `.github/workflows/jules-render.yml` at `gcloud run jobs execute` instead of the
Jules API call. Everything else (AGENTS.md, the scripts, the buckets) is unchanged.
