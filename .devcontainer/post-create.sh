#!/usr/bin/env bash
set -euo pipefail

corepack enable
CI=true pnpm install --config.confirmModulesPurge=false
pnpm exec baml-cli generate --from baml_src

echo "AgentNotes devcontainer ready."
echo "Next.js: http://localhost:3000"
echo "Using services from .env.local (DigitalOcean)"