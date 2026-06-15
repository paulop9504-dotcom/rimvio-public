import { NextResponse, type NextRequest } from "next/server";
import { requireAuthUser } from "@/lib/auth/api-auth";
import { normalizePhoneE164 } from "@/lib/peer-chat/phone";
import { completeDmFriendAdd } from "@/lib/peer-chat/dm-friend-add-server";
import { extractErrorMessage } from "@/lib/peer-chat/extract-error-message";
import {
  FriendContactLookupError,
  lookupRegisteredFriendContact,
} from "@/lib/peer-chat/lookup-friend-contact";
import { peerApiErrorResponse } from "@/lib/peer-chat/peer-api-errors";
import {
  readUserProfile,
  syncUserProfileFromAuth,
  upsertUserProfile,
} from "@/lib/peer-chat/server-peer-chat";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

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

  const callerId = auth.user?.id;
  if (!callerId) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      phone?: string;
      email?: string;
      contact?: string;
      displayName?: string;
      myPhone?: string;
    };

    const rawContact = (body.contact ?? body.email ?? body.phone ?? "").trim();
    if (!rawContact) {
      return NextResponse.json(
        { error: "친구 Rimvio ID · 전화번호 · 이메일을 입력해 주세요." },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    await syncUserProfileFromAuth(supabase, {
      userId: callerId,
      email: auth.user?.email,
      displayName:
        (auth.user?.user_metadata?.full_name as string | undefined) ||
        auth.user?.email?.split("@")[0] ||
        null,
    });

    let callerProfile = await readUserProfile(supabase, callerId);

    if (!callerProfile?.phone_e164) {
      const myPhone = normalizePhoneE164(body.myPhone ?? "");
      if (myPhone) {
        await upsertUserProfile(supabase, {
          userId: callerId,
          phoneE164: myPhone,
          emailLower: callerProfile?.email_lower ?? null,
          displayName: callerProfile?.display_name,
        });
        callerProfile = await readUserProfile(supabase, callerId);
      }
    }

    let lookup;
    try {
      lookup = await lookupRegisteredFriendContact(supabase, {
        callerId,
        rawContact,
      });
    } catch (error) {
      if (error instanceof FriendContactLookupError) {
        const status = error.code === "not_registered" ? 404 : 400;
        return NextResponse.json(
          { error: error.code, message: error.message },
          { status },
        );
      }
      throw error;
    }

    const otherUserId = lookup.otherUserId;
    const friendName = body.displayName?.trim() || lookup.displayName;
    const matchedBy = lookup.matchedBy;

    const added = await completeDmFriendAdd(supabase, {
      otherUserId,
      friendDisplayName: friendName,
    });

    return NextResponse.json({
      threadId: added.threadId,
      displayName: added.displayName,
      otherUserId: added.otherUserId,
      rimvioId: lookup.rimvioId,
      emailLower: lookup.emailLower,
      realtime: true,
      matchedBy,
    });
  } catch (error) {
    return peerApiErrorResponse(error, "친구 추가에 실패했어요. 잠시 후 다시 시도해 주세요.");
  }
}
