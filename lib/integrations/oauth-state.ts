import { createHmac, randomBytes } from "node:crypto";
import { resolveAppOrigin } from "@/lib/auth/redirect-url";
import type { IntegrationProviderId } from "@/lib/integrations/types";

const COOKIE_NAME = "rimvio_oauth_state";
const MAX_AGE_SEC = 600;

export type OAuthStatePayload = {
  provider: IntegrationProviderId;
  next: string;
  userId: string | null;
  sessionId: string | null;
  nonce: string;
  exp: number;
};

function stateSecret(): string {
  return (
    process.env.INTEGRATIONS_ENCRYPTION_KEY?.trim() ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ??
    "rimvio-oauth-state-dev"
  );
}

function sign(payloadB64: string): string {
  return createHmac("sha256", stateSecret()).update(payloadB64).digest("base64url");
}

export function encodeOAuthState(payload: Omit<OAuthStatePayload, "nonce" | "exp">): string {
  const full: OAuthStatePayload = {
    ...payload,
    nonce: randomBytes(16).toString("hex"),
    exp: Date.now() + MAX_AGE_SEC * 1000,
  };
  const body = Buffer.from(JSON.stringify(full)).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function decodeOAuthState(token: string): OAuthStatePayload | null {
  const [body, sig] = token.split(".");
  if (!body || !sig || sign(body) !== sig) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as OAuthStatePayload;
    if (!payload.exp || payload.exp < Date.now()) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function oauthStateCookieOptions(token: string) {
  return {
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: resolveAppOrigin().startsWith("https://"),
    sameSite: "lax" as const,
    path: "/",
    maxAge: MAX_AGE_SEC,
  };
}

export function readOAuthStateCookie(request: Request): string | null {
  const cookie = request.headers.get("cookie") ?? "";
  const match = cookie.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

export { COOKIE_NAME as OAUTH_STATE_COOKIE_NAME };
