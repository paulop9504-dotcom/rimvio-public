#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  googleCalendarOAuthRedirectUri,
  isGoogleCalendarOAuthConfigured,
} from "../lib/google-calendar/oauth-setup";

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!existsSync(envPath)) {
    return;
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
}

loadEnvLocal();

process.env.NEXT_PUBLIC_APP_URL =
  process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000";

const redirectUri = googleCalendarOAuthRedirectUri();
assert.match(redirectUri, /\/api\/integrations\/oauth\/callback$/);

const configured = isGoogleCalendarOAuthConfigured();
if (configured) {
  assert.ok(process.env.GOOGLE_CLIENT_ID?.trim());
  assert.ok(process.env.GOOGLE_CLIENT_SECRET?.trim());
  console.log("test-google-calendar-oauth-config: ok (configured)");
  console.log(`  redirect_uri: ${redirectUri}`);
} else {
  console.log("test-google-calendar-oauth-config: ok (not configured — dev skip)");
  console.log(`  expected redirect_uri when configured: ${redirectUri}`);
  console.log("  set GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET in .env.local");
}
