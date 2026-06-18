/** Routes that require a signed-in user when AUTH_REQUIRED is enabled. */
export const PROTECTED_ROUTES = [
  "/feed",
  "/now",
  "/calendar",
  "/chat",
  "/stack",
  "/inbox",
] as const;

/** Legacy entry paths mapped to protected surfaces. */
const PROTECTED_ALIASES: Record<string, (typeof PROTECTED_ROUTES)[number]> = {
  "/": "/feed",
};

/** Paths that bypass AuthGate (OAuth callback only). */
export const AUTH_GATE_BYPASS_PREFIXES = ["/auth/callback"] as const;

export function normalizeProtectedPath(pathname: string): string {
  const base = pathname.split("?")[0] ?? pathname;
  return PROTECTED_ALIASES[base] ?? base;
}

export function isProtectedRoute(pathname: string): boolean {
  const normalized = normalizeProtectedPath(pathname);
  return PROTECTED_ROUTES.some(
    (route) =>
      normalized === route || normalized.startsWith(`${route}/`),
  );
}

export function isAuthGateBypass(pathname: string): boolean {
  return AUTH_GATE_BYPASS_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
