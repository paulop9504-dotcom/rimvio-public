#!/usr/bin/env npx tsx

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { collectHealthReport } from "../lib/server/health-check";
import { isSupabaseConfigured } from "../lib/supabase/config";
import { missingSupabaseEnvKeys } from "../lib/auth/setup";
import { getAuthCallbackUrl } from "../lib/auth/redirect-url";
import { isGoogleCalendarOAuthConfigured } from "../lib/google-calendar/oauth-setup";
import { integrationOAuthCallbackUrl } from "../lib/integrations/oauth-providers";

function loadEnvFile(fileName: string) {
  const envPath = path.join(process.cwd(), fileName);
  if (!existsSync(envPath)) {
    return false;
  }
  const raw = readFileSync(envPath, "utf8");
  for (const line of raw.split(/\r?\n/u)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const eq = trimmed.indexOf("=");
    if (eq <= 0) {
      continue;
    }
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
  return true;
}

const args = new Set(process.argv.slice(2));
const useVercelEnv = args.has("--vercel-env");
const checkRemote = args.has("--remote");
const remoteUrl =
  process.env.DEPLOY_URL?.trim() ||
  process.env.NEXT_PUBLIC_APP_URL?.trim() ||
  "https://new-project-pi-one-52.vercel.app";

if (useVercelEnv) {
  loadEnvFile(".env.vercel.production");
} else {
  loadEnvFile(".env.local");
}

type Check = { id: string; ok: boolean; detail: string };

const checks: Check[] = [];

const supabaseMissing = missingSupabaseEnvKeys();
const pulledEnvMasked =
  useVercelEnv &&
  supabaseMissing.length > 0 &&
  process.env.NEXT_PUBLIC_SUPABASE_URL === "";
checks.push({
  id: "supabase-env",
  ok: supabaseMissing.length === 0 || pulledEnvMasked,
  detail:
    supabaseMissing.length === 0
      ? "NEXT_PUBLIC_SUPABASE_URL + ANON_KEY set"
      : pulledEnvMasked
        ? "encrypted on Vercel (verify via --remote /api/health)"
        : `missing: ${supabaseMissing.join(", ")}`,
});

const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() ?? "";
const productionUrl = remoteUrl.replace(/\/$/, "");
const useProductionUrlFallback =
  pulledEnvMasked && productionUrl.length > 0 && !productionUrl.includes("localhost");

if (useProductionUrlFallback && (!appUrl || appUrl.includes("localhost"))) {
  process.env.NEXT_PUBLIC_APP_URL = productionUrl;
}

const effectiveAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() ?? "";

checks.push({
  id: "app-url",
  ok:
    (effectiveAppUrl.length > 0 && !effectiveAppUrl.includes("localhost")) ||
    useProductionUrlFallback,
  detail: effectiveAppUrl
    ? effectiveAppUrl.includes("localhost")
      ? `localhost only — set production URL for deploy (${effectiveAppUrl})`
      : effectiveAppUrl
    : useProductionUrlFallback
      ? `set on Vercel runtime (alias: ${productionUrl})`
      : "NEXT_PUBLIC_APP_URL empty — OAuth redirect will break on Vercel",
});

checks.push({
  id: "auth-callback",
  ok: Boolean(
    (effectiveAppUrl && !effectiveAppUrl.includes("localhost")) ||
      process.env.VERCEL_URL ||
      useProductionUrlFallback,
  ),
  detail: `callback: ${getAuthCallbackUrl()}`,
});

const googleOauthReady = isGoogleCalendarOAuthConfigured();
checks.push({
  id: "google-calendar-oauth",
  ok: true,
  detail: googleOauthReady
    ? `configured · ${integrationOAuthCallbackUrl()}`
    : "optional — GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET not set",
});

async function main() {
  if (isSupabaseConfigured()) {
    const localHealth = await collectHealthReport();
    checks.push({
      id: "supabase-reachable",
      ok: localHealth.supabase.reachable,
      detail: localHealth.supabase.reachable
        ? "auth/v1/health OK"
        : "Supabase unreachable from this machine",
    });
  }

  if (checkRemote) {
    try {
      const response = await fetch(`${remoteUrl.replace(/\/$/, "")}/api/health`, {
        cache: "no-store",
        signal: AbortSignal.timeout(15_000),
      });
      const body = (await response.json()) as {
        ok?: boolean;
        supabase?: { configured?: boolean; reachable?: boolean };
      };
      checks.push({
        id: "remote-health",
        ok: response.ok && body.ok === true,
        detail: `${remoteUrl}/api/health → ${response.status} supabase.reachable=${body.supabase?.reachable ?? "?"}`,
      });
    } catch (error) {
      checks.push({
        id: "remote-health",
        ok: false,
        detail: `fetch failed: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  const failed = checks.filter((row) => !row.ok);
  console.log("\n=== Rimvio deploy readiness ===\n");
  for (const row of checks) {
    console.log(`${row.ok ? "✓" : "✗"} ${row.id}: ${row.detail}`);
  }

  if (failed.length > 0) {
    console.log(`\nFAIL (${failed.length} check(s))\n`);
    process.exit(1);
  }

  console.log("\nOK — ready for production deploy\n");
}

void main();
