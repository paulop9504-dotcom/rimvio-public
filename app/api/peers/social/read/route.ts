import { NextResponse, type NextRequest } from "next/server";
import { requireAuthUser } from "@/lib/auth/api-auth";
import { markThreadRead } from "@/lib/peer-chat/friend-connections-server";
import { markFeedSlotRead } from "@/lib/peer-chat/relationship-slots-server";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: true });
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
    const body = (await request.json()) as { threadId?: string };
    if (!body.threadId) {
      return NextResponse.json({ error: "threadId required." }, { status: 400 });
    }

    const supabase = await createClient();
    await markThreadRead(supabase, {
      userId,
      threadId: body.threadId,
    });
    await markFeedSlotRead(supabase, { userId, roomId: body.threadId });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to mark read.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
