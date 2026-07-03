#!/usr/bin/env bash

set -euo pipefail

CLUSTER_NAME="${DO_PG_CLUSTER_NAME:-agentnotes-db-cluster}"
REGION="${DO_PG_REGION:-nyc1}"
ENGINE_VERSION="${DO_PG_VERSION:-16}"
NODE_COUNT="${DO_PG_NUM_NODES:-1}"
SIZE_SLUG="${DO_PG_SIZE:-db-s-1vcpu-1gb}"
SQL_FILE="${DO_PG_SQL_FILE:-db-setup.sql}"

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

require_command doctl
require_command psql

lookup_cluster_id() {
  doctl databases list --format ID,Name --no-header | awk -v name="$CLUSTER_NAME" '$2 == name { print $1; exit }'
}

cat <<EOF
[do-postgres] target cluster: $CLUSTER_NAME
[do-postgres] region: $REGION
[do-postgres] engine version: $ENGINE_VERSION
[do-postgres] schema file: $SQL_FILE
EOF

cluster_id="$(lookup_cluster_id)"

if [[ -z "$cluster_id" ]]; then
  echo "[do-postgres] creating cluster $CLUSTER_NAME"
  doctl databases create "$CLUSTER_NAME" \
    --engine pg \
    --version "$ENGINE_VERSION" \
    --region "$REGION" \
    --size "$SIZE_SLUG" \
    --num-nodes "$NODE_COUNT" \
    --wait

  cluster_id="$(lookup_cluster_id)"
fi

if [[ -z "$cluster_id" ]]; then
  echo "[do-postgres] unable to resolve cluster id for $CLUSTER_NAME" >&2
  exit 1
fi

database_uri="$(doctl databases connection "$cluster_id" --format URI --no-header)"

if [[ -z "$database_uri" ]]; then
  echo "[do-postgres] unable to retrieve DATABASE_URL for $CLUSTER_NAME" >&2
  exit 1
fi

echo "[do-postgres] applying schema from $SQL_FILE"
psql "$database_uri" -f "$SQL_FILE"

echo "[do-postgres] cluster id: $cluster_id"
echo "[do-postgres] DATABASE_URL=$database_uri"