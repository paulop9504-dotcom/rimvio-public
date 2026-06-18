import { NextResponse, type NextRequest } from "next/server";
import { requireAuthUser } from "@/lib/auth/api-auth";
import {
  aiMessageTypeForMode,
  type AiMode,
} from "@/lib/chat-room/types";
import { mapPeerMessageRow } from "@/lib/peer-chat/message-mapper";
import { orchestratePeerRoomAi } from "@/lib/peer-chat/room-ai-orchestrate";
import { touchRelationshipSlotsOnMessage } from "@/lib/peer-chat/relationship-slots-server";
import {
  ensurePeerThread,
  insertPeerMessage,
  listPeerMessages,
} from "@/lib/peer-chat/server-peer-chat";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ threadId: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
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

  const { threadId } = await context.params;
  const decoded = decodeURIComponent(threadId);

  try {
    const body = (await request.json()) as {
      prompt?: string;
      displayName?: string;
    };
    const prompt = body.prompt?.trim();
    if (!prompt) {
      return NextResponse.json({ error: "prompt required." }, { status: 400 });
    }

    const supabase = await createClient();
    await ensurePeerThread(supabase, {
      threadId: decoded,
      displayName: body.displayName?.trim() || "친구",
      userId,
    });

    const threadMeta = await supabase
      .from("peer_threads")
      .select("ai_mode")
      .eq("id", decoded)
      .maybeSingle();

    const aiMode = ((threadMeta.data as { ai_mode?: AiMode } | null)?.ai_mode ??
      "private") as AiMode;
    const aiType = aiMessageTypeForMode(aiMode);

    const rows = await listPeerMessages(supabase, decoded);
    const visible = rows.map((row) => mapPeerMessageRow(row, userId));

    const { body: aiBody, payload } = await orchestratePeerRoomAi({
      prompt,
      peerDisplayName: body.displayName?.trim() || "친구",
      messages: visible,
    });

    const aiRow = await insertPeerMessage(supabase, {
      threadId: decoded,
      senderUserId: userId,
      body: aiBody,
      messageType: aiType,
      aiPayload: payload,
    });

    await touchRelationshipSlotsOnMessage(supabase, {
      threadId: decoded,
      senderUserId: userId,
      body: aiBody,
      createdAt: aiRow.created_at,
    });

    return NextResponse.json({
      message: mapPeerMessageRow(aiRow, userId),
      visibility: aiMode === "private" ? "caller_only" : "room",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI invoke failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
