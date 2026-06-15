import {
  RIMVIO_SUPABASE_ANON_KEY,
  RIMVIO_SUPABASE_URL,
} from "@/lib/supabase/rimvio-supabase-public";

const RIMVIO_PROJECT_REF = extractSupabaseRef(RIMVIO_SUPABASE_URL);

function looksValidAnonKey(value: string | undefined): value is string {
  const key = value?.trim();
  return Boolean(key && key.startsWith("eyJ") && key.length > 100);
}

function looksValidUrl(value: string | undefined): value is string {
  const url = value?.trim();
  return Boolean(url && url.includes(".supabase.co"));
}

function extractSupabaseRef(url: string): string | null {
  const match = url.match(/https?:\/\/([a-z0-9]+)\.supabase\.co/i);
  return match?.[1] ?? null;
}

function envPointsAtRimvioProject(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!looksValidUrl(url) || !looksValidAnonKey(key)) {
    return false;
  }
  const ref = extractSupabaseRef(url);
  return Boolean(ref && RIMVIO_PROJECT_REF && ref === RIMVIO_PROJECT_REF);
}

/** Server/runtime resolver — browser client uses rimvio-supabase-public directly. */
export function resolvePublicSupabaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (envPointsAtRimvioProject() && looksValidUrl(fromEnv)) {
    return fromEnv;
  }
  return RIMVIO_SUPABASE_URL;
}

export function resolvePublicSupabaseAnonKey(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (
    envPointsAtRimvioProject() &&
    fromEnv === RIMVIO_SUPABASE_ANON_KEY
  ) {
    return fromEnv;
  }
  return RIMVIO_SUPABASE_ANON_KEY;
}

export function isSupabaseConfigured() {
  return Boolean(
    resolvePublicSupabaseUrl() && resolvePublicSupabaseAnonKey(),
  );
}
