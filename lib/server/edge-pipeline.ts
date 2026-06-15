import { NextResponse, type NextRequest } from "next/server";
import {
  devCookieOptions,
  isDevOnlyPath,
  isDevSurfacesEnabled,
} from "@/lib/dev/dev-surfaces";
import { isBodyTooLarge } from "@/lib/server/body-limit";
import { logApi } from "@/lib/server/logger";
import {
  checkRateLimit,
  rateLimitResponse,
  resolveRateLimitTier,
} from "@/lib/server/rate-limit";
import {
  createRequestId,
  readClientIp,
  REQUEST_ID_HEADER,
} from "@/lib/server/request-context";
import { applySecurityHeaders } from "@/lib/server/security-headers";
import { enforceAuthRequired } from "@/lib/auth/middleware-enforce";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { updateSession } from "@/lib/supabase/middleware";
import { LOCALE_COOKIE } from "@/lib/i18n/locale-store";

export async function runEdgePipeline(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const requestId = createRequestId();

  if (pathname === "/share" && request.method === "POST") {
    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = "/api/share-receiver";
    const response = NextResponse.rewrite(rewriteUrl);
    response.headers.set(REQUEST_ID_HEADER, requestId);
    applySecurityHeaders(response);
    return response;
  }

  if (request.nextUrl.searchParams.get("dev") === "1") {
    const devRedirect = NextResponse.redirect(
      new URL(pathname, request.nextUrl.origin)
    );
    devRedirect.cookies.set(devCookieOptions());
    applySecurityHeaders(devRedirect);
    return devRedirect;
  }

  if (isDevOnlyPath(pathname) && !isDevSurfacesEnabled(request)) {
    const response = NextResponse.redirect(new URL("/", request.url));
    applySecurityHeaders(response);
    return response;
  }

  const tier = resolveRateLimitTier(pathname, request.method);
  if (tier) {
    const limited = checkRateLimit(request, tier);
    if (limited) {
      const response = rateLimitResponse(limited.retryAfterSec);
      response.headers.set(REQUEST_ID_HEADER, requestId);
      applySecurityHeaders(response);
      logApi("warn", "rate_limited", {
        route: pathname,
        method: request.method,
        requestId,
        status: 429,
        ip: readClientIp(request),
      });
      return response;
    }
  }

  if (pathname.startsWith("/api/") && isBodyTooLarge(request, pathname)) {
    const response = NextResponse.json(
      { error: "Payload too large." },
      { status: 413, headers: { [REQUEST_ID_HEADER]: requestId } }
    );
    applySecurityHeaders(response);
    return response;
  }

  // OAuth callback must not refresh/mutate auth cookies before code exchange.
  const skipSessionRefresh = pathname.startsWith("/auth/callback");

  let response =
    isSupabaseConfigured() && !skipSessionRefresh
      ? await updateSession(request)
      : NextResponse.next({ request });

  const authBlock = await enforceAuthRequired(request, response);
  if (authBlock) {
    response = authBlock;
  }

  if (!request.cookies.get(LOCALE_COOKIE)) {
    response.cookies.set(LOCALE_COOKIE, "ko", {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
  }

  response.headers.set(REQUEST_ID_HEADER, requestId);
  applySecurityHeaders(response);
  return response;
}
