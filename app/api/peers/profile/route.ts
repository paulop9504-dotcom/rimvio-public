import { NextResponse, type NextRequest } from "next/server";
import { requireAuthUser } from "@/lib/auth/api-auth";
import { normalizePhoneE164 } from "@/lib/peer-chat/phone";
import { validateRimvioId } from "@/lib/peer-chat/rimvio-id";
import { removeUserProfileAvatar } from "@/lib/peer-chat/profile-avatar-server";
import {
  patchUserProfile,
  readUserProfile,
  syncUserProfileFromAuth,
} from "@/lib/peer-chat/server-peer-chat";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ configured: false });
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

export async function PATCH(request: NextRequest) {
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
    const body = (await request.json()) as {
      displayName?: string;
      phone?: string;
      rimvioId?: string;
      clearPhone?: boolean;
      clearAvatar?: boolean;
    };

    const patch: {
      displayName?: string | null;
      phoneE164?: string | null;
      rimvioId?: string;
      avatarUrl?: string | null;
    } = {};

    if (body.displayName !== undefined) {
      const trimmed = body.displayName.trim();
      if (!trimmed || trimmed.length > 40) {
        return NextResponse.json(
          { error: "표시 이름은 1~40자로 입력해 주세요." },
          { status: 400 },
        );
      }
      patch.displayName = trimmed;
    }

    if (body.clearPhone) {
      patch.phoneE164 = null;
    } else if (body.phone !== undefined) {
      const phoneE164 = normalizePhoneE164(body.phone);
      if (!phoneE164) {
        return NextResponse.json(
          { error: "올바른 휴대폰 번호를 입력해 주세요 (예: 010-1234-5678)." },
          { status: 400 },
        );
      }
      patch.phoneE164 = phoneE164;
    }

    if (body.rimvioId !== undefined) {
      const parsed = validateRimvioId(body.rimvioId);
      if (!parsed.ok) {
        return NextResponse.json({ error: parsed.reason }, { status: 400 });
      }
      patch.rimvioId = parsed.id;
    }

    if (body.clearAvatar) {
      const supabase = await createClient();
      await removeUserProfileAvatar(supabase, userId);
      const profile = await readUserProfile(supabase, userId);
      return NextResponse.json({
        ok: true,
        phone: profile?.phone_e164 ?? null,
        email: profile?.email_lower ?? null,
        rimvioId: profile?.rimvio_id ?? null,
        displayName: profile?.display_name ?? null,
        avatarUrl: null,
      });
    }

    if (
      patch.displayName === undefined &&
      patch.phoneE164 === undefined &&
      patch.rimvioId === undefined
    ) {
      return NextResponse.json({ error: "변경할 항목이 없습니다." }, { status: 400 });
    }

    const supabase = await createClient();
    await syncUserProfileFromAuth(supabase, {
      userId,
      email: auth.user?.email,
      displayName:
        (auth.user?.user_metadata?.full_name as string | undefined) ||
        auth.user?.email?.split("@")[0] ||
        null,
    });

    const profile = await patchUserProfile(supabase, {
      userId,
      emailLower: auth.user?.email?.toLowerCase() ?? null,
      ...patch,
    });

    return NextResponse.json({
      ok: true,
      phone: profile?.phone_e164 ?? null,
      email: profile?.email_lower ?? null,
      rimvioId: profile?.rimvio_id ?? null,
      displayName: profile?.display_name ?? null,
      avatarUrl: profile?.avatar_url ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update profile.";
    const status =
      message.includes("unique") || message.includes("duplicate") ? 409 : 500;
    return NextResponse.json(
      {
        error:
          status === 409
            ? message.includes("phone") || message.includes("phone_e164")
              ? "이 번호는 다른 계정에 등록되어 있어요."
              : "이미 사용 중인 Rimvio ID예요. 다른 ID를 골라 주세요."
            : message,
      },
      { status },
    );
  }
}
