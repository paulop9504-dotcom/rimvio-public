import { NextResponse, type NextRequest } from "next/server";
import { resolveAppOrigin } from "@/lib/auth/redirect-url";
import { getAuthUserId } from "@/lib/auth/session";
import { upsertIntegrationForUser } from "@/lib/integrations/integrations-server-store";
import { exchangeOAuthCode } from "@/lib/integrations/oauth-providers";
import {
  decodeOAuthState,
  OAUTH_STATE_COOKIE_NAME,
  readOAuthStateCookie,
} from "@/lib/integrations/oauth-state";
import { catalogEntryFor } from "@/lib/integrations/catalog";
import { integrationStatusPath } from "@/lib/integrations/oauth-redirect";
import { tryCreateClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const origin = resolveAppOrigin(request);
  const code = request.nextUrl.searchParams.get("code");
  const stateParam = request.nextUrl.searchParams.get("state");
  const oauthError = request.nextUrl.searchParams.get("error");

  if (oauthError) {
    return NextResponse.redirect(
      `${origin}/welcome?integration=error&reason=${encodeURIComponent(oauthError)}`,
    );
  }

  if (!code || !stateParam) {
    return NextResponse.redirect(`${origin}/welcome?integration=missing_code`);
  }

  const cookieState = readOAuthStateCookie(request);
  if (!cookieState || cookieState !== stateParam) {
    return NextResponse.redirect(`${origin}/welcome?integration=invalid_state`);
  }

  const state = decodeOAuthState(stateParam);
  if (!state) {
    return NextResponse.redirect(`${origin}/welcome?integration=expired_state`);
  }

  const userId = await getAuthUserId();
  if (!userId || (state.userId && state.userId !== userId)) {
    return NextResponse.redirect(
      `${origin}${integrationStatusPath(state.next, "login_required", {
        provider: state.provider,
      })}`,
    );
  }

  const supabase = await tryCreateClient();
  if (!supabase) {
    return NextResponse.redirect(
      `${origin}${integrationStatusPath(state.next, "storage_unavailable", {
        provider: state.provider,
      })}`,
    );
  }

  try {
    const tokenPayload = await exchangeOAuthCode(state.provider, code, origin);
    const entry = catalogEntryFor(state.provider);
    const label =
      tokenPayload.workspace_name ??
      tokenPayload.notion_workspace_name ??
      entry?.label ??
      state.provider;

    await upsertIntegrationForUser(supabase, {
      userId,
      provider: state.provider,
      authKind: "oauth",
      secret: tokenPayload,
      label,
      scopes: Array.isArray(tokenPayload.scopes) ? tokenPayload.scopes : entry?.oauthScopes,
    });

    const redirect = `${origin}${integrationStatusPath(state.next, "connected", {
      provider: state.provider,
    })}`;
    const response = NextResponse.redirect(redirect);
    response.cookies.set(OAUTH_STATE_COOKIE_NAME, "", { path: "/", maxAge: 0 });
    return response;
  } catch (error) {
    console.error("[integrations/oauth/callback]", error);
    const reason = error instanceof Error ? error.message : "oauth_failed";
    return NextResponse.redirect(
      `${origin}${integrationStatusPath(state.next, "error", {
        provider: state.provider,
        reason,
      })}`,
    );
  }
}
