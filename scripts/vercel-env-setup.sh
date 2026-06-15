#!/usr/bin/env bash
# Register Rimvio API keys on Vercel (Production + Preview + Development).
# Usage: bash scripts/vercel-env-setup.sh
# Requires: vercel CLI logged in, project linked as rimvio

set -euo pipefail

cd "$(dirname "$0")/.."

prompt_secret() {
  local name="$1"
  local value=""
  read -rsp "Enter ${name}: " value
  echo
  if [ -z "$value" ]; then
    echo "Skipped ${name} (empty)."
    return 1
  fi
  printf '%s' "$value"
}

add_env() {
  local name="$1"
  local value="$2"
  for env in production preview development; do
    printf '%s' "$value" | npx vercel env add "$name" "$env" --force
    echo "  -> ${name} (${env})"
  done
}

echo "=== Rimvio Vercel env setup ==="
echo "Project: rimvio ($(npx vercel project ls 2>/dev/null | head -1 || echo 'link with: npx vercel link --project rimvio'))"
echo

read -rp "NEXT_PUBLIC_SUPABASE_URL (https://xxx.supabase.co): " SUPABASE_URL
if [ -n "$SUPABASE_URL" ]; then
  add_env "NEXT_PUBLIC_SUPABASE_URL" "$SUPABASE_URL"
fi

if ANON=$(prompt_secret "NEXT_PUBLIC_SUPABASE_ANON_KEY"); then
  add_env "NEXT_PUBLIC_SUPABASE_ANON_KEY" "$ANON"
fi

read -rp "NEXT_PUBLIC_APP_URL (https://your-app.vercel.app): " APP_URL
if [ -n "$APP_URL" ]; then
  add_env "NEXT_PUBLIC_APP_URL" "$APP_URL"
fi

if GEMINI=$(prompt_secret "GEMINI_API_KEY"); then
  add_env "GEMINI_API_KEY" "$GEMINI"
fi

if VISION=$(prompt_secret "GOOGLE_CLOUD_VISION_API_KEY"); then
  add_env "GOOGLE_CLOUD_VISION_API_KEY" "$VISION"
fi

if PLACES=$(prompt_secret "GOOGLE_PLACES_API_KEY"); then
  add_env "GOOGLE_PLACES_API_KEY" "$PLACES"
fi

echo
echo "Done. Redeploy: npx vercel deploy --prod"
echo "Verify: curl -X POST https://YOUR_APP/api/locate (with image form)"
