import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/api-auth";
import { syncUserProfileFromAuth } from "@/lib/peer-chat/server-peer-chat";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

/** Google 로그인 이메일을 친구 검색용 프로필에 등록합니다. */
export async function POST() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false });
  }

  const auth = await requireAuthUser();
  if ("response" in auth) {
    return auth.response;
  }

  const user = auth.user;
  if (!user?.id) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  try {
    const supabase = await createClient();
    const profile = await syncUserProfileFromAuth(supabase, {
      userId: user.id,
      email: user.email,
      displayName:
        (user.user_metadata?.full_name as string | undefined) ||
        user.email?.split("@")[0] ||
        null,
    });

    return NextResponse.json({
      ok: true,
      email: profile?.email_lower ?? null,
      phone: profile?.phone_e164 ?? null,
      rimvioId: profile?.rimvio_id ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
