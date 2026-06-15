import { NextResponse, type NextRequest } from "next/server";
import { requireAuthUser } from "@/lib/auth/api-auth";
import { normalizePhoneE164 } from "@/lib/peer-chat/phone";
import {
  readUserProfile,
  syncUserProfileFromAuth,
  upsertUserProfile,
} from "@/lib/peer-chat/server-peer-chat";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ configured: false, phone: null });
  }

  const auth = await requireAuthUser();
  if ("response" in auth) {
    return auth.response;
  }

  const userId = auth.user?.id;
  if (!userId) {
    return NextResponse.json({ phone: null }, { status: 401 });
  }

  try {
    const supabase = await createClient();
    await syncUserProfileFromAuth(supabase, {
      userId,
      email: auth.user?.email,
      displayName:
        (auth.user?.user_metadata?.full_name as string | undefined) ||
        auth.user?.email?.split("@")[0] ||
        null,
    });
    const profile = await readUserProfile(supabase, userId);
    return NextResponse.json({
      configured: true,
      phone: profile?.phone_e164 ?? null,
      email: profile?.email_lower ?? auth.user?.email?.toLowerCase() ?? null,
      rimvioId: profile?.rimvio_id ?? null,
      displayName: profile?.display_name ?? null,
      avatarUrl: profile?.avatar_url ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to read profile.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 503 },
    );
  }

  const auth = await requireAuthUser();
  if ("response" in auth) {
    return auth.response;
  }

  const userId = auth.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { phone?: string; displayName?: string };
    const phoneE164 = normalizePhoneE164(body.phone ?? "");
    if (!phoneE164) {
      return NextResponse.json(
        { error: "올바른 휴대폰 번호를 입력해 주세요 (예: 010-1234-5678)." },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    await upsertUserProfile(supabase, {
      userId,
      phoneE164,
      emailLower: auth.user?.email?.toLowerCase() ?? null,
      displayName:
        body.displayName?.trim() ||
        (auth.user?.user_metadata?.full_name as string | undefined) ||
        auth.user?.email?.split("@")[0] ||
        null,
    });

    return NextResponse.json({ phone: phoneE164, ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save phone.";
    const status = message.includes("unique") ? 409 : 500;
    return NextResponse.json(
      {
        error:
          status === 409
            ? "이 번호는 다른 계정에 등록되어 있어요."
            : message,
      },
      { status },
    );
  }
}
