import { NextResponse, type NextRequest } from "next/server";
import { resolveAppOrigin } from "@/lib/auth/redirect-url";
import { getAuthUserId } from "@/lib/auth/session";
import { isIntegrationProviderId } from "@/lib/integrations/catalog";
import {
  buildOAuthAuthorizeUrl,
  isOAuthProviderConfigured,
} from "@/lib/integrations/oauth-providers";
import {
  encodeOAuthState,
  oauthStateCookieOptions,
} from "@/lib/integrations/oauth-state";
import { integrationStatusPath } from "@/lib/integrations/oauth-redirect";
import type { IntegrationProviderId } from "@/lib/integrations/types";

type RouteContext = {
  params: Promise<{ provider: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { provider: raw } = await context.params;

  if (!isIntegrationProviderId(raw)) {
    return NextResponse.json({ error: "Unknown provider." }, { status: 400 });
  }

  const provider = raw as IntegrationProviderId;

  if (!isOAuthProviderConfigured(provider)) {
    return NextResponse.json(
      {
        error: "OAuth is not configured on this server.",
        code: "oauth_not_configured",
        hint: "Use API token in Settings or set SLACK_/NOTION_ client env vars.",
      },
      { status: 503 },
    );
  }

  const userId = await getAuthUserId();
  const next = request.nextUrl.searchParams.get("next") ?? "/welcome";
  const safeNext = next.startsWith("/") ? next : "/welcome";

  if (!userId) {
    const loginNext = integrationStatusPath(safeNext, "login_required", {
      provider,
    });
    return NextResponse.redirect(new URL(loginNext, request.url));
  }

  const sessionId = request.nextUrl.searchParams.get("sessionId");

  const state = encodeOAuthState({
    provider,
    next: safeNext,
    userId,
    sessionId,
  });

  const origin = resolveAppOrigin(request);
  const authorizeUrl = buildOAuthAuthorizeUrl(provider, state, origin);
  if (!authorizeUrl) {
    return NextResponse.json({ error: "Could not build authorize URL." }, { status: 500 });
  }

  const response = NextResponse.redirect(authorizeUrl);
  const cookie = oauthStateCookieOptions(state);
  response.cookies.set(cookie.name, cookie.value, {
    httpOnly: cookie.httpOnly,
    secure: cookie.secure,
    sameSite: cookie.sameSite,
    path: cookie.path,
    maxAge: cookie.maxAge,
  });

  return response;
}
