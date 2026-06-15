import { NextResponse, type NextRequest } from "next/server";
import { requireAuthUser } from "@/lib/auth/api-auth";
import { pinFriend } from "@/lib/peer-chat/friend-connections-server";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
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
      friendId?: string;
      pinSlot?: number;
    };
    if (!body.friendId || body.pinSlot === undefined) {
      return NextResponse.json(
        { error: "friendId and pinSlot required." },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const row = await pinFriend(supabase, {
      userId,
      friendId: body.friendId,
      pinSlot: body.pinSlot,
    });

    return NextResponse.json({ ok: true, connection: row });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to pin friend.";
    const status =
      message === "pin_limit" || message === "slot_taken" ? 409 : 500;
    return NextResponse.json(
      {
        error:
          message === "pin_limit"
            ? "고정은 최대 5명까지예요."
            : message === "slot_taken"
              ? "이 슬롯에는 이미 다른 친구가 있어요."
              : message,
      },
      { status },
    );
  }
}
