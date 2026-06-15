import { NextResponse, type NextRequest } from "next/server";
import { requireAuthUser } from "@/lib/auth/api-auth";
import { unpinFriend } from "@/lib/peer-chat/friend-connections-server";
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
    const body = (await request.json()) as { friendId?: string };
    if (!body.friendId) {
      return NextResponse.json({ error: "friendId required." }, { status: 400 });
    }

    const supabase = await createClient();
    const row = await unpinFriend(supabase, {
      userId,
      friendId: body.friendId,
    });

    return NextResponse.json({ ok: true, connection: row });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to unpin friend.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
