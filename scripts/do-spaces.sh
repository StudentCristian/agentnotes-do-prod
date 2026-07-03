#!/usr/bin/env bash

set -euo pipefail

BUCKET_NAME="${DO_SPACES_BUCKET:-agentnotes-audio-prod}"
KEY_NAME="${DO_SPACES_KEY_NAME:-agentnotes-audio-keys}"
CORS_FILE="${DO_SPACES_CORS_FILE:-spaces-cors.json}"

cat <<EOF
[do-spaces] Spaces is manual in this rollout.
[do-spaces] Create the bucket, apply CORS, and configure lifecycle in the DigitalOcean UI.
[do-spaces] Bucket name: $BUCKET_NAME
[do-spaces] Suggested key name: $KEY_NAME
[do-spaces] CORS file to mirror manually: $CORS_FILE
[do-spaces] Lifecycle policy: delete temporary audio objects after 1 day.
[do-spaces] Follow MANUAL-DO-UI-STEPS.md for the exact steps.
EOF