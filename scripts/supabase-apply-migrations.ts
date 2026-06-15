/**
 * Applies supabase/migrations via Supabase Management API.
 * Requires SUPABASE_ACCESS_TOKEN in .env.local (Dashboard → Account → Access Tokens).
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import path from "node:path";

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

function projectRefFromUrl(url: string | undefined): string | null {
  if (!url) {
    return null;
  }
  const m = url.match(/https:\/\/([a-z0-9]+)\.supabase\.co/i);
  return m?.[1] ?? null;
}

async function runQuery(
  projectRef: string,
  token: string,
  query: string,
): Promise<{ ok: boolean; body: string }> {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    },
  );
  const text = await res.text();
  return { ok: res.ok, body: text };
}

loadEnvLocal();

const token = process.env.SUPABASE_ACCESS_TOKEN?.trim();
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const projectRef =
  process.env.SUPABASE_PROJECT_REF?.trim() ??
  projectRefFromUrl(supabaseUrl);

const fromArg = process.argv.find((a) => a.startsWith("--from="));
const fromPrefix = fromArg?.split("=")[1] ?? "013";

console.log("\n=== Rimvio Supabase migrations ===\n");

if (!token) {
  console.log("❌ SUPABASE_ACCESS_TOKEN이 없습니다.\n");
  console.log("1. https://supabase.com/dashboard/account/tokens → Generate new token");
  console.log("2. new-project/.env.local 에 한 줄 추가:");
  console.log("   SUPABASE_ACCESS_TOKEN=sbp_xxxxxxxx");
  console.log("3. 다시 실행: npm run db:apply\n");
  process.exit(1);
}

if (!projectRef) {
  console.log("❌ 프로젝트 ref를 알 수 없습니다. NEXT_PUBLIC_SUPABASE_URL 또는 SUPABASE_PROJECT_REF 필요.\n");
  process.exit(1);
}

const migrationsDir = path.join(process.cwd(), "supabase", "migrations");
const files = readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort()
  .filter((f) => f >= `${fromPrefix}_` || f.startsWith(fromPrefix));

if (files.length === 0) {
  console.log(`❌ 적용할 migration 없음 (--from=${fromPrefix})\n`);
  process.exit(1);
}

async function main() {
  console.log(`Project: ${projectRef}`);
  console.log(`Files: ${files.join(", ")}\n`);

  let failed = false;
  for (const file of files) {
    const sql = readFileSync(path.join(migrationsDir, file), "utf8");
    process.stdout.write(`→ ${file} ... `);
    const { ok, body } = await runQuery(projectRef!, token!, sql);
    if (!ok) {
      console.log("FAIL");
      console.log(body.slice(0, 2000));
      failed = true;
      break;
    }
    console.log("OK");
  }

  const verify = await runQuery(
    projectRef!,
    token!,
    `select exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'peer_threads'
  ) as peer_chat_ready;`,
  );

  if (!failed && verify.ok) {
    try {
      const rows = JSON.parse(verify.body) as { peer_chat_ready?: boolean }[];
      const ready = rows[0]?.peer_chat_ready === true;
      console.log(
        ready
          ? "\n✅ peer_threads 테이블 확인됨.\n"
          : "\n⚠️ peer_threads 없음 — SQL 오류 여부 확인.\n",
      );
    } catch {
      console.log("\n✅ migrations 전송 완료 (verify parse skipped).\n");
    }
  }

  process.exit(failed ? 1 : 0);
}

void main();
