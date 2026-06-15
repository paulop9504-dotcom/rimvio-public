import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function GET() {
  const configured = isSupabaseConfigured();
  const user = configured ? await getAuthUser() : null;

  return NextResponse.json({
    configured,
    signedIn: Boolean(user),
    email: user?.email ?? null,
    name:
      user?.user_metadata?.full_name ??
      user?.user_metadata?.name ??
      null,
  });
}
