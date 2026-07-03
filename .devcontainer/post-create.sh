#!/usr/bin/env bash
set -euo pipefail

corepack enable
pnpm install
pnpm exec baml-cli generate --from baml_src
pnpm build

mc alias set local http://minio:9000 minioadmin minioadmin
mc mb --ignore-existing local/agentnotes-audio-tmp

echo "AgentNotes devcontainer ready."
echo "Next.js: http://localhost:3000"
echo "PostgreSQL: postgres://postgres:postgres@localhost:5432/agentnotes"
echo "MinIO API: http://localhost:9000"
echo "MinIO Console: http://localhost:9001"