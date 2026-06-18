const ANONYMOUS_SEED_KEY = "rimvio.curation-telemetry.seed";

/** Stable anonymous seed when auth user id is unavailable. */
export function resolveTelemetryUserSeed(authUserId?: string | null): string {
  const trimmed = authUserId?.trim();
  if (trimmed) {
    return trimmed;
  }
  if (typeof window === "undefined") {
    return "server-anonymous";
  }
  try {
    const existing = sessionStorage.getItem(ANONYMOUS_SEED_KEY);
    if (existing?.trim()) {
      return existing.trim();
    }
    const seed = `anon-${crypto.randomUUID()}`;
    sessionStorage.setItem(ANONYMOUS_SEED_KEY, seed);
    return seed;
  } catch {
    return "anon-fallback";
  }
}

/** Non-reversible de-identification for telemetry payloads. */
export function hashTelemetryUserId(seed: string): string {
  let hash = 5381;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 33) ^ seed.charCodeAt(i);
  }
  return `u_${(hash >>> 0).toString(16).padStart(8, "0")}`;
}
