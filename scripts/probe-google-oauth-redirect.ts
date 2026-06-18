/**
 * Prints the redirect_uri Google receives (from Supabase authorize redirect).
 * Run: npx tsx scripts/probe-google-oauth-redirect.ts
 */

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { googleOAuthRedirectUriForSupabase } from "../lib/auth/setup";

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/u)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvLocal();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
const appUrl =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
  "https://new-project-pi-one-52.vercel.app";
const redirectTo = `${appUrl}/auth/callback`;

const expectedGoogleUri = googleOAuthRedirectUriForSupabase(supabaseUrl);

console.log("\n=== Google OAuth redirect_uri 점검 ===\n");
console.log("Supabase 프로젝트:", supabaseUrl);
console.log("앱 OAuth redirectTo:", redirectTo);
console.log(
  "\nGoogle Cloud에 **정확히** 이 URI 하나를 등록해야 합니다:\n",
  expectedGoogleUri,
);

if (!supabaseUrl || !anonKey) {
  console.error("\n.env.local에 Supabase URL/anon key 필요\n");
  process.exit(1);
}

const authorizeUrl = new URL(`${supabaseUrl}/auth/v1/authorize`);
authorizeUrl.searchParams.set("provider", "google");
authorizeUrl.searchParams.set("redirect_to", redirectTo);

async function main() {
  const response = await fetch(authorizeUrl.toString(), {
    redirect: "manual",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
  });

  const location = response.headers.get("location");
  console.log("\nSupabase authorize 응답:", response.status);

  if (!location) {
    console.log("Location 헤더 없음 — body:", (await response.text()).slice(0, 500));
    process.exit(1);
  }

  console.log("Google로 보내는 URL (일부):", location.slice(0, 120), "...\n");

  const googleUrl = new URL(location);
  const redirectUri = googleUrl.searchParams.get("redirect_uri");

  if (redirectUri) {
    console.log("실제 redirect_uri 파라미터:");
    console.log(" ", redirectUri);
    console.log(
      "\n일치 여부:",
      redirectUri === expectedGoogleUri ? "✓ expected와 동일" : "✗ 다름 — Google에 위 URI 등록",
    );
  } else {
    console.log("redirect_uri 파라미터를 찾지 못함 (전체 Location 확인 필요)");
  }
}

void main();
