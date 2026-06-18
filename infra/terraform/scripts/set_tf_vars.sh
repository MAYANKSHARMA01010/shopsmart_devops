#!/usr/bin/env bash
# =============================================================================
# set_tf_vars.sh — Export sensitive Terraform variables from .env files
#
# Usage (run from the terraform/ directory):
#   source ./scripts/set_tf_vars.sh
#
# This script reads DATABASE_URL and REDIS_SERVER_URL from ../server/.env
# and exports them as TF_VAR_* so Terraform picks them up automatically,
# without requiring them to be hardcoded in terraform.tfvars.
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SERVER_ENV="$REPO_ROOT/server/.env"

if [[ ! -f "$SERVER_ENV" ]]; then
  echo "ERROR: $SERVER_ENV not found. Aborting." >&2
  exit 1
fi

# Load server/.env (skip comment lines and blank lines)
while IFS='=' read -r key value; do
  [[ "$key" =~ ^#.*$ || -z "$key" ]] && continue
  # Strip inline comments and surrounding quotes
  value="${value%%#*}"
  value="${value%"${value##*[![:space:]]}"}"
  value="${value#\"}" ; value="${value%\"}"
  value="${value#\'}" ; value="${value%\'}"
  export "$key=$value"
done < <(grep -v '^\s*#' "$SERVER_ENV" | grep -v '^\s*$')

# Map to Terraform variable names
export TF_VAR_database_url="${DATABASE_URL:?DATABASE_URL not set in server/.env}"
export TF_VAR_redis_url="${REDIS_SERVER_URL:?REDIS_SERVER_URL not set in server/.env}"

echo "✅ TF_VAR_database_url  → set (${#TF_VAR_database_url} chars)"
echo "✅ TF_VAR_redis_url     → set (${#TF_VAR_redis_url} chars)"
echo ""
echo "You can now run: terraform plan / terraform apply"
