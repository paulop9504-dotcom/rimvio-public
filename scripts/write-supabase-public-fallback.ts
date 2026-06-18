import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const envPath = path.join(process.cwd(), ".env.local");
const env: Record<string, string> = {};

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
  env[key] = value;
}

const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

if (!url?.includes("supabase.co") || !anon?.startsWith("eyJ")) {
  throw new Error("Invalid Supabase values in .env.local");
}

const contents = `/**
 * Public Supabase credentials (anon key is client-visible by design).
 * Fallback when Vercel env is missing or invalid.
 */
export const RIMVIO_SUPABASE_URL = ${JSON.stringify(url)} as const;
export const RIMVIO_SUPABASE_ANON_KEY = ${JSON.stringify(anon)} as const;
`;

writeFileSync(
  path.join(process.cwd(), "lib/supabase/rimvio-supabase-public.ts"),
  contents,
);

console.log("wrote lib/supabase/rimvio-supabase-public.ts");
