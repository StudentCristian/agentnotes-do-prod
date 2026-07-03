#!/usr/bin/env bash

set -euo pipefail

APP_NAME="${DO_APP_NAME:-agentnotes}"
APP_ID=""
SPEC_PATH="${DO_APP_SPEC_PATH:-.do/app.yaml}"
UPDATE_ONLY="false"

usage() {
  cat <<EOF
Usage: $0 [--app-id <id>] [--spec <path>] [--update-only]
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --app-id)
      APP_ID="$2"
      shift 2
      ;;
    --spec)
      SPEC_PATH="$2"
      shift 2
      ;;
    --update-only)
      UPDATE_ONLY="true"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 1
      ;;
  esac
done

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

require_command doctl
require_command awk
require_command mktemp

cat <<EOF
[do-app-platform] app name: $APP_NAME
[do-app-platform] spec path: $SPEC_PATH
[do-app-platform] update only: $UPDATE_ONLY
EOF

required_envs=(
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  CLERK_SECRET_KEY
  EDGE_STORE_ACCESS_KEY
  EDGE_STORE_SECRET_KEY
  GOOGLE_AI_API_KEY
  DATABASE_URL
  DO_SPACES_KEY
  DO_SPACES_SECRET
)

for env_name in "${required_envs[@]}"; do
  if [[ -z "${!env_name:-}" ]]; then
    echo "Missing required environment variable: $env_name" >&2
    exit 1
  fi
done

export DO_SPACES_BUCKET="${DO_SPACES_BUCKET:-agentnotes-audio-prod}"
export DO_SPACES_REGION="${DO_SPACES_REGION:-nyc3}"
export DO_SPACES_ENDPOINT="${DO_SPACES_ENDPOINT:-https://nyc3.digitaloceanspaces.com}"

lookup_app_id() {
  doctl apps list --format ID,Spec.Name --no-header | awk -v app_name="$APP_NAME" '$2 == app_name { print $1; exit }'
}

rendered_spec="$(mktemp)"
trap 'rm -f "$rendered_spec"' EXIT

awk '
  /^[[:space:]]*- key: / {
    current = $3
    print
    next
  }
  /^[[:space:]]*value:/ && current != "" && (current in ENVIRON) {
    value = ENVIRON[current]
    gsub(/\\/, "\\\\", value)
    gsub(/"/, "\\\"", value)
    sub(/value:.*/, "value: \"" value "\"")
    print
    next
  }
  {
    print
  }
' "$SPEC_PATH" > "$rendered_spec"

doctl apps spec validate "$rendered_spec" >/dev/null

echo "[do-app-platform] rendered spec validated"

if [[ -z "$APP_ID" ]]; then
  APP_ID="$(lookup_app_id)"
fi

if [[ -z "$APP_ID" ]]; then
  if [[ "$UPDATE_ONLY" == "true" ]]; then
    echo "[do-app-platform] --update-only was set but no existing app named $APP_NAME was found" >&2
    exit 1
  fi

  echo "[do-app-platform] creating app $APP_NAME"
  doctl apps create --spec "$rendered_spec" --wait
  APP_ID="$(lookup_app_id)"
else
  echo "[do-app-platform] updating app $APP_ID"
  doctl apps update "$APP_ID" --spec "$rendered_spec" --update-sources --wait
fi

if [[ -z "$APP_ID" ]]; then
  echo "[do-app-platform] unable to resolve app id for $APP_NAME" >&2
  exit 1
fi

echo "[do-app-platform] app id: $APP_ID"
echo "[do-app-platform] default ingress: $(doctl apps get "$APP_ID" --format DefaultIngress --no-header)"