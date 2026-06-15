/**
 * Sync Supabase Auth URL config with Rimvio production domains.
 * Usage: npx tsx scripts/sync-supabase-auth-urls.ts
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

const PROD_URL = "https://rimvio.app";
const VERCEL_ALIAS = "https://rimvio.vercel.app";
const VERCEL_LEGACY = "https://new-project-pi-one-52.vercel.app";
const LOCAL_URL = "http://localhost:3000";

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/u)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

function projectRefFromUrl(url: string | undefined): string | null {
  if (!url) return null;
  const m = url.match(/https:\/\/([a-z0-9]+)\.supabase\.co/i);
  return m?.[1] ?? null;
}

async function main() {
  loadEnvLocal();

  const token = process.env.SUPABASE_ACCESS_TOKEN?.trim();
  const projectRef =
    process.env.SUPABASE_PROJECT_REF?.trim() ??
    projectRefFromUrl(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim());

  if (!token || !projectRef) {
    console.error("Need SUPABASE_ACCESS_TOKEN + NEXT_PUBLIC_SUPABASE_URL in .env.local");
    process.exit(1);
  }

  const redirectUrls = [
    `${PROD_URL}/auth/callback`,
    `${VERCEL_ALIAS}/auth/callback`,
    `${VERCEL_LEGACY}/auth/callback`,
    `${LOCAL_URL}/auth/callback`,
  ];

  const res = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/config/auth`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        site_url: PROD_URL,
        uri_allow_list: redirectUrls.join(","),
      }),
    },
  );

  const body = await res.text();
  if (!res.ok) {
    console.error("Supabase auth config update failed:", body);
    process.exit(1);
  }

  console.log("Supabase Auth URLs synced:");
  console.log(`  Site URL: ${PROD_URL}`);
  for (const url of redirectUrls) {
    console.log(`  Redirect: ${url}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
