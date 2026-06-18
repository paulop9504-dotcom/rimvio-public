/** Cookie set before OAuth; read in `/auth/callback` (avoids query on redirectTo). */
export const AUTH_NEXT_COOKIE = "rimvio_auth_next";

export function readAuthNextPath(fallback = "/onboarding"): string {
  if (typeof document === "undefined") {
    return fallback;
  }

  const raw = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${AUTH_NEXT_COOKIE}=`))
    ?.slice(AUTH_NEXT_COOKIE.length + 1);

  if (!raw) {
    return fallback;
  }

  try {
    const decoded = decodeURIComponent(raw);
    return decoded.startsWith("/") ? decoded : fallback;
  } catch {
    return fallback;
  }
}

export function clearAuthNextCookie(): void {
  if (typeof document === "undefined") {
    return;
  }

  const secure = window.location.protocol === "https:";
  document.cookie = `${AUTH_NEXT_COOKIE}=; path=/; max-age=0; SameSite=Lax${secure ? "; Secure" : ""}`;
}

/**
 * OAuth redirect URL — path only (no `?next=`).
 * Supabase allowlist must include this exact URL or `origin/**`.
 */
export function getAuthCallbackUrl() {
  const origin = resolveAppOrigin();
  return `${origin}/auth/callback`;
}

export function resolveAppOrigin(request?: {
  headers: { get(name: string): string | null };
  nextUrl?: { origin: string };
}) {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  if (request) {
    const forwardedHost = request.headers.get("x-forwarded-host");
    const host = forwardedHost ?? request.headers.get("host");
    if (host) {
      const proto =
        request.headers.get("x-forwarded-proto") ??
        (host.includes("localhost") ? "http" : "https");
      return `${proto}://${host}`.replace(/\/$/, "");
    }
    if (request.nextUrl?.origin) {
      return request.nextUrl.origin.replace(/\/$/, "");
    }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (appUrl) {
    return appUrl.replace(/\/$/, "");
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return "http://localhost:3000";
}
