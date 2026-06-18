/**
 * Push Supabase + APP env from .env.local to linked Vercel project.
 * Usage: npx tsx scripts/push-vercel-env.ts
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const PROD_URL =
  process.env.RIMVIO_PROD_URL?.trim().replace(/\/$/, "") ??
  "https://rimvio.vercel.app";

const PREVIEW_BRANCH =
  process.env.RIMVIO_PREVIEW_BRANCH?.trim() ?? "release/v1-rimvio-core";

const KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_APP_URL",
] as const;

function loadEnvLocal(): Record<string, string> {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!existsSync(envPath)) {
    throw new Error(".env.local not found");
  }

  const out: Record<string, string> = {};
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
    out[key] = value;
  }
  return out;
}

function addEnv(
  key: string,
  value: string,
  target: "production" | "preview",
) {
  const args =
    target === "preview"
      ? [
          "vercel",
          "env",
          "add",
          key,
          target,
          PREVIEW_BRANCH,
          "--value",
          value,
          "--yes",
          "--force",
        ]
      : ["vercel", "env", "add", key, target, "--value", value, "--yes", "--force"];

  const result = spawnSync("npx", args, {
    encoding: "utf8",
    shell: true,
    cwd: process.cwd(),
  });
  if (result.status !== 0) {
    console.error(`Failed ${key} (${target}):`, result.stderr || result.stdout);
    process.exit(1);
  }
  const label = target === "preview" ? `${target}/${PREVIEW_BRANCH}` : target;
  console.log(`✓ ${key} → ${label}`);
}

const env = loadEnvLocal();

console.log("\n=== Vercel env push ===");
console.log("APP_URL override:", PROD_URL);
console.log("Preview branch:", PREVIEW_BRANCH);
console.log("anon key length:", env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length ?? 0);
console.log("");

for (const key of KEYS) {
  let value = env[key]?.trim();
  if (!value) {
    console.error(`Missing ${key} in .env.local`);
    process.exit(1);
  }
  if (key === "NEXT_PUBLIC_APP_URL") {
    value = PROD_URL;
  }
  addEnv(key, value, "production");
  addEnv(key, value, "preview");
}

console.log("\nDone. Run: npx vercel deploy --prod\n");
