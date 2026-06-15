import { isSupabaseConfigured } from "@/lib/supabase/config";
import { isNaverSearchConfigured } from "@/lib/naver/config";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), ".data");

export type HealthReport = {
  ok: boolean;
  ts: number;
  supabase: { configured: boolean; reachable: boolean };
  naver: { configured: boolean };
  storage: { writable: boolean };
  version: string;
};

async function probeWritableStorage() {
  try {
    await mkdir(DATA_DIR, { recursive: true });
    const probePath = path.join(DATA_DIR, ".health-probe");
    await writeFile(probePath, String(Date.now()), "utf8");
    await unlink(probePath);
    return true;
  } catch {
    return false;
  }
}

async function probeSupabase() {
  if (!isSupabaseConfigured()) {
    return false;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    return false;
  }

  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!anonKey) {
    return false;
  }

  try {
    const response = await fetch(`${url.replace(/\/$/, "")}/auth/v1/health`, {
      method: "GET",
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
      signal: AbortSignal.timeout(4_000),
      cache: "no-store",
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function collectHealthReport(): Promise<HealthReport> {
  const [storageWritable, supabaseReachable] = await Promise.all([
    probeWritableStorage(),
    probeSupabase(),
  ]);

  const supabaseConfigured = isSupabaseConfigured();
  const onVercel = Boolean(process.env.VERCEL);
  const storageOk = onVercel || storageWritable;
  const ok = storageOk && (!supabaseConfigured || supabaseReachable);

  return {
    ok,
    ts: Date.now(),
    supabase: {
      configured: supabaseConfigured,
      reachable: supabaseReachable,
    },
    naver: {
      configured: isNaverSearchConfigured(),
    },
    storage: {
      writable: storageWritable,
    },
    version: process.env.npm_package_version ?? "0.0.0",
  };
}
