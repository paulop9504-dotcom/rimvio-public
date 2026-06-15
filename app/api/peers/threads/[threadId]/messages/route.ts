import { NextResponse, type NextRequest } from "next/server";
import { requireAuthUser } from "@/lib/auth/api-auth";
import { mapPeerMessageRow } from "@/lib/peer-chat/message-mapper";
import { extractErrorMessage } from "@/lib/peer-chat/extract-error-message";
import { friendContactErrorMessage } from "@/lib/peer-chat/friend-contact-errors";
import { peerApiErrorResponse } from "@/lib/peer-chat/peer-api-errors";
import {
  recordInboundMessage,
  markThreadRead,
} from "@/lib/peer-chat/friend-connections-server";
import {
  markFeedSlotRead,
  touchRelationshipSlotsOnMessage,
} from "@/lib/peer-chat/relationship-slots-server";
import { resolvePeerThreadIdForSend } from "@/lib/peer-chat/resolve-canonical-peer-thread";
import { listGroupReadCursors } from "@/lib/peer-chat/group-read-receipt";
import { isGroupThreadId } from "@/lib/peer-chat/group-thread";
import { readPeerLastReadAt } from "@/lib/peer-chat/peer-read-receipt";
import {
  ensurePeerThread,
  insertPeerMessage,
  listPeerMessages,
} from "@/lib/peer-chat/server-peer-chat";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ threadId: string }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
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
    const supabase = await createClient();
    const resolvedThreadId = await resolvePeerThreadIdForSend(supabase, {
      userId,
      threadId: decoded,
    });
    const rows = await listPeerMessages(supabase, resolvedThreadId);
    const messages = rows.map((row) => mapPeerMessageRow(row, userId));
    await markThreadRead(supabase, { userId, threadId: resolvedThreadId });
    await markFeedSlotRead(supabase, { userId, roomId: resolvedThreadId });
    const peerLastReadAt = await readPeerLastReadAt(supabase, {
      userId,
      threadId: resolvedThreadId,
    });
    const groupReadCursors = isGroupThreadId(resolvedThreadId)
      ? await listGroupReadCursors(supabase, {
          threadId: resolvedThreadId,
          callerUserId: userId,
        })
      : [];

    return NextResponse.json({ messages, peerLastReadAt, groupReadCursors });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load messages.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

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
      body?: string;
      displayName?: string;
    };
    const text = body.body?.trim();
    if (!text) {
      return NextResponse.json({ error: "body required." }, { status: 400 });
    }

    const supabase = await createClient();
    const threadId = await resolvePeerThreadIdForSend(supabase, {
      userId,
      threadId: decoded,
      displayName: body.displayName,
    });

    await ensurePeerThread(supabase, {
      threadId,
      displayName: body.displayName?.trim() || "친구",
      userId,
    });

    const row = await insertPeerMessage(supabase, {
      threadId,
      senderUserId: userId,
      body: text,
    });

    try {
      await recordInboundMessage(supabase, {
        threadId,
        senderUserId: userId,
      });
    } catch (sideEffectError) {
      console.error("[peer-messages] recordInboundMessage", sideEffectError);
    }

    try {
      await touchRelationshipSlotsOnMessage(supabase, {
        threadId,
        senderUserId: userId,
        body: text,
        createdAt: row.created_at,
      });
    } catch (sideEffectError) {
      console.error("[peer-messages] touchRelationshipSlotsOnMessage", sideEffectError);
    }

    return NextResponse.json({
      feedSlotSynced: true,
      message: mapPeerMessageRow(row, userId),
    });
  } catch (error) {
    const raw = extractErrorMessage(error, "Failed to send message.");
    if (raw.includes("not_registered")) {
      return peerApiErrorResponse(error, "가입한 Rimvio 사용자와만 대화할 수 있어요.");
    }
    const message = friendContactErrorMessage(raw);
    return NextResponse.json({ error: message, message }, { status: 500 });
  }
}
