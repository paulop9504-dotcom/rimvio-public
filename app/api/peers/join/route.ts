import { NextResponse, type NextRequest } from "next/server";
import { requireAuthUser } from "@/lib/auth/api-auth";
import { isGroupThreadId } from "@/lib/peer-chat/group-thread";
import { joinPeerThreadByInvite } from "@/lib/peer-chat/server-peer-chat";
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

  const userId = auth.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { inviteCode?: string };
    const inviteCode = body.inviteCode?.trim();
    if (!inviteCode) {
      return NextResponse.json({ error: "inviteCode required." }, { status: 400 });
    }

    const supabase = await createClient();
    const thread = await joinPeerThreadByInvite(supabase, { inviteCode, userId });

    const roomKind =
      thread.room_kind ??
      (isGroupThreadId(thread.id) ? "group" : "dm");

    return NextResponse.json({
      threadId: thread.id,
      displayName: thread.display_name,
      inviteCode: thread.invite_code,
      roomKind,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to join thread.";
    const status = message.includes("Invalid invite") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
