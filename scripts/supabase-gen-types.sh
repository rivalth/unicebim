#!/usr/bin/env bash
set -euo pipefail

SCHEMA="${SUPABASE_SCHEMA:-public}"
OUT_FILE="${SUPABASE_TYPES_OUT_FILE:-src/lib/supabase/types.generated.ts}"

if ! command -v supabase >/dev/null 2>&1; then
  echo "supabase CLI not found. Install it first: https://supabase.com/docs/guides/cli" >&2
  exit 1
fi

if [ -n "${SUPABASE_PROJECT_ID:-}" ]; then
  echo "Generating types using SUPABASE_PROJECT_ID=$SUPABASE_PROJECT_ID (schema=$SCHEMA) -> $OUT_FILE"
  supabase gen types typescript --project-id "$SUPABASE_PROJECT_ID" --schema "$SCHEMA" > "$OUT_FILE"
  exit 0
fi

echo "Generating types using linked project (schema=$SCHEMA) -> $OUT_FILE"
echo "If this fails, run: supabase link --project-ref <your-project-ref> and export SUPABASE_ACCESS_TOKEN."
supabase gen types typescript --linked --schema "$SCHEMA" > "$OUT_FILE"


