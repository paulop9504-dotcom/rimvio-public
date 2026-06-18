import { NextResponse, type NextRequest } from "next/server";
import { requireAuthUser } from "@/lib/auth/api-auth";
import { normalizePhoneE164 } from "@/lib/peer-chat/phone";
import {
  readUserProfile,
  registerFriendsFromPhoneContacts,
  syncUserProfileFromAuth,
} from "@/lib/peer-chat/server-peer-chat";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

const MAX_ENTRIES = 400;

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
      contacts?: Array<{ name?: string; phone?: string }>;
    };

    const entries: Array<{ name: string; phoneE164: string }> = [];
    const seen = new Set<string>();

    for (const row of body.contacts ?? []) {
      if (entries.length >= MAX_ENTRIES) {
        break;
      }
      const phoneE164 = normalizePhoneE164(row.phone ?? "");
      if (!phoneE164 || seen.has(phoneE164)) {
        continue;
      }
      seen.add(phoneE164);
      entries.push({
        name: row.name?.trim() || "친구",
        phoneE164,
      });
    }

    if (entries.length === 0) {
      return NextResponse.json(
        { error: "연락처에서 유효한 번호를 찾지 못했어요." },
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

    const callerProfile = await readUserProfile(supabase, callerId);
    if (
      !callerProfile?.rimvio_id &&
      !callerProfile?.phone_e164 &&
      !callerProfile?.email_lower
    ) {
      return NextResponse.json(
        {
          error: "need_contact",
          message: "ROOM에서 내 Rimvio ID를 먼저 만들어 주세요.",
        },
        { status: 400 },
      );
    }

    const result = await registerFriendsFromPhoneContacts(supabase, {
      callerUserId: callerId,
      callerDisplayName:
        callerProfile.display_name ||
        callerProfile.rimvio_id ||
        "친구",
      entries,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to sync contacts.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
