import { NextResponse, type NextRequest } from "next/server";
import { requireAuthUser } from "@/lib/auth/api-auth";
import { friendContactErrorMessage } from "@/lib/peer-chat/friend-contact-errors";
import { mapPeerMessageRow } from "@/lib/peer-chat/message-mapper";
import {
  recordInboundMessage,
} from "@/lib/peer-chat/friend-connections-server";
import { touchRelationshipSlotsOnMessage } from "@/lib/peer-chat/relationship-slots-server";
import { uploadPeerChatImage } from "@/lib/peer-chat/peer-chat-image-server";
import { resolvePeerThreadIdForSend } from "@/lib/peer-chat/resolve-canonical-peer-thread";
import {
  ensurePeerThread,
  insertPeerMessage,
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
    const form = await request.formData();
    const file = form.get("file");
    const captionRaw = form.get("caption");
    const caption =
      typeof captionRaw === "string" ? captionRaw.trim().slice(0, 4000) : "";

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "사진 파일이 필요해요." }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    if (!supabaseUrl) {
      return NextResponse.json({ error: "Supabase URL missing." }, { status: 503 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const supabase = await createClient();

    const displayName =
      typeof form.get("displayName") === "string"
        ? String(form.get("displayName")).trim() || "친구"
        : "친구";

    const threadId = await resolvePeerThreadIdForSend(supabase, {
      userId,
      threadId: decoded,
      displayName,
    });

    await ensurePeerThread(supabase, {
      threadId,
      displayName,
      userId,
    });

    const { messageId, imageUrl } = await uploadPeerChatImage(supabase, {
      userId,
      threadId,
      supabaseUrl,
      bytes,
      contentType: file.type || "image/jpeg",
    });

    const row = await insertPeerMessage(supabase, {
      id: messageId,
      threadId,
      senderUserId: userId,
      body: caption,
      imageUrl,
    });

    try {
      await recordInboundMessage(supabase, {
        threadId,
        senderUserId: userId,
      });
    } catch (sideEffectError) {
      console.error("[peer-image] recordInboundMessage", sideEffectError);
    }

    try {
      await touchRelationshipSlotsOnMessage(supabase, {
        threadId,
        senderUserId: userId,
        body: caption || "사진",
        createdAt: row.created_at,
      });
    } catch (sideEffectError) {
      console.error("[peer-image] touchRelationshipSlotsOnMessage", sideEffectError);
    }

    return NextResponse.json({
      feedSlotSynced: true,
      message: mapPeerMessageRow(row, userId),
    });
  } catch (error) {
    const raw =
      error instanceof Error ? error.message : "사진 전송에 실패했어요.";
    const message = friendContactErrorMessage(raw);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
