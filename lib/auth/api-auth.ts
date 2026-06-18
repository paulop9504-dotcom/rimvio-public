import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { getAuthUser } from "@/lib/auth/session";
import { isAuthRequired } from "@/lib/auth/policy";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export function unauthorizedResponse(message = "Authentication required.") {
  return NextResponse.json(
    { error: message, authRequired: true },
    { status: 401 },
  );
}

export function authMisconfiguredResponse() {
  return NextResponse.json(
    {
      error: "Authentication is required but Supabase is not configured.",
      authRequired: true,
    },
    { status: 503 },
  );
}

/** Ensures an authenticated user when AUTH_REQUIRED is enabled. */
export async function requireAuthUser(): Promise<
  { user: User } | { response: NextResponse } | { optional: true; user: User | null }
> {
  if (!isAuthRequired()) {
    const user = await getAuthUser();
    return { optional: true, user };
  }

  if (!isSupabaseConfigured()) {
    return { response: authMisconfiguredResponse() };
  }

  const user = await getAuthUser();
  if (!user) {
    return { response: unauthorizedResponse() };
  }

  return { user };
}

export async function getAuthUserIdRequired(): Promise<string | null> {
  const result = await requireAuthUser();
  if ("response" in result) {
    return null;
  }
  if ("optional" in result) {
    return result.user?.id ?? null;
  }
  return result.user.id;
}
