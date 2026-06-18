import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { User } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { isAuthRequired } from "@/lib/auth/policy";
import { isPublicApiPath } from "@/lib/auth/policy";
import { isProtectedRoute } from "@/lib/auth/protected-routes";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  resolvePublicSupabaseAnonKey,
  resolvePublicSupabaseUrl,
} from "@/lib/supabase/resolve-public-supabase-env";

function authRequiredJson(status: number, error: string) {
  return NextResponse.json({ error, authRequired: true }, { status });
}

export async function readAuthUser(
  request: NextRequest,
  response: NextResponse,
): Promise<User | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = createServerClient<Database>(
    resolvePublicSupabaseUrl(),
    resolvePublicSupabaseAnonKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

/**
 * Returns a blocking response when auth is required but missing; otherwise null.
 */
export async function enforceAuthRequired(
  request: NextRequest,
  response: NextResponse,
): Promise<NextResponse | null> {
  if (!isAuthRequired()) {
    return null;
  }

  const pathname = request.nextUrl.pathname;

  // Pages: AuthGate + LoginScreen handle UI on the same URL.
  if (!pathname.startsWith("/api/")) {
    return null;
  }

  if (isPublicApiPath(pathname)) {
    return null;
  }

  if (!isSupabaseConfigured()) {
    return authRequiredJson(
      503,
      "Authentication is required but Supabase is not configured.",
    );
  }

  const user = await readAuthUser(request, response);
  if (user) {
    return null;
  }

  return authRequiredJson(401, "Authentication required.");
}

/** Server-side guard for protected page routes (SSR/data). */
export function shouldDenyProtectedPage(pathname: string, hasUser: boolean) {
  if (!isAuthRequired() || hasUser) {
    return false;
  }
  return isProtectedRoute(pathname);
}
