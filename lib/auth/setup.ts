const SUPABASE_ENV_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
] as const;

export function missingSupabaseEnvKeys(): string[] {
  return SUPABASE_ENV_KEYS.filter((key) => !process.env[key]?.trim());
}

export function getSupabaseProjectRef(url: string | undefined) {
  if (!url?.trim()) {
    return null;
  }

  try {
    const host = new URL(url.trim()).hostname;
    const ref = host.split(".")[0];
    return ref || null;
  } catch {
    return null;
  }
}

export function googleOAuthRedirectUriForSupabase(url: string | undefined) {
  const ref = getSupabaseProjectRef(url);
  if (!ref) {
    return null;
  }

  return `https://${ref}.supabase.co/auth/v1/callback`;
}

export function getAuthCallbackPath(nextPath = "/") {
  const next = nextPath.startsWith("/") ? nextPath : `/${nextPath}`;
  return `/auth/callback?next=${encodeURIComponent(next)}`;
}
