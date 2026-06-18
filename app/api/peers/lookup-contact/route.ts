import { NextResponse, type NextRequest } from "next/server";
import { requireAuthUser } from "@/lib/auth/api-auth";
import {
  FriendContactLookupError,
  lookupRegisteredFriendContact,
} from "@/lib/peer-chat/lookup-friend-contact";
import { syncUserProfileFromAuth } from "@/lib/peer-chat/server-peer-chat";
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
    const body = (await request.json()) as { contact?: string };
    const rawContact = body.contact?.trim() ?? "";
    const supabase = await createClient();

    await syncUserProfileFromAuth(supabase, {
      userId: callerId,
      email: auth.user?.email,
      displayName:
        (auth.user?.user_metadata?.full_name as string | undefined) ||
        auth.user?.email?.split("@")[0] ||
        null,
    });

    const lookup = await lookupRegisteredFriendContact(supabase, {
      callerId,
      rawContact,
    });

    return NextResponse.json({
      profile: {
        userId: lookup.otherUserId,
        displayName: lookup.displayName,
        rimvioId: lookup.rimvioId,
        avatarUrl: lookup.avatarUrl,
        emailLower: lookup.emailLower,
        matchedBy: lookup.matchedBy,
      },
      contact: rawContact,
    });
  } catch (error) {
    if (error instanceof FriendContactLookupError) {
      const status =
        error.code === "not_registered"
          ? 404
          : error.code === "need_contact"
            ? 400
            : 400;
      return NextResponse.json(
        { error: error.code, message: error.message },
        { status },
      );
    }
    const message =
      error instanceof Error
        ? error.message
        : "친구를 찾지 못했어요. 잠시 후 다시 시도해 주세요.";
    return NextResponse.json({ error: "lookup_failed", message }, { status: 500 });
  }
}
