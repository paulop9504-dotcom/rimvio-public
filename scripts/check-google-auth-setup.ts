import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import {
  googleOAuthRedirectUriForSupabase,
  missingSupabaseEnvKeys,
} from "../lib/auth/setup";
import { getAuthCallbackUrl } from "../lib/auth/redirect-url";

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
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnvLocal();

const missing = missingSupabaseEnvKeys();
const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const googleRedirect = googleOAuthRedirectUriForSupabase(supabaseUrl);

console.log("\n=== Rimvio Google 로그인 설정 점검 ===\n");

if (missing.length > 0) {
  console.log("❌ .env.local에 아래 값이 필요합니다:");
  for (const key of missing) {
    console.log(`   - ${key}`);
  }
  console.log("\n가이드: docs/GOOGLE_AUTH.md\n");
  process.exit(1);
}

console.log("✓ Supabase env 키 존재");
console.log(`  APP_URL: ${appUrl}`);
console.log(`  OAuth redirectTo: ${getAuthCallbackUrl()}`);

if (googleRedirect) {
  console.log(`\nGoogle Cloud → Authorized redirect URIs 에 추가:\n  ${googleRedirect}`);
}

console.log("\nSupabase → Authentication → URL Configuration:");
console.log(`  Site URL: ${appUrl}`);
console.log(`  Redirect URLs: ${appUrl}/auth/callback`);

console.log("\n다음: Supabase 대시보드에서 Google Provider 활성화 후 dev 서버 재시작\n");
