import { NextResponse, type NextRequest } from "next/server";
import { requireAuthUser } from "@/lib/auth/api-auth";
import { peerApiErrorResponse } from "@/lib/peer-chat/peer-api-errors";
import { isGroupThreadId } from "@/lib/peer-chat/group-thread";
import {
  ensurePeerThread,
  readPeerThread,
  renameGroupThread,
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
    let thread = await readPeerThread(supabase, decoded);

    if (!thread) {
      if (isGroupThreadId(decoded)) {
        return NextResponse.json({ error: "Group thread not found." }, { status: 404 });
      }
      const ensured = await ensurePeerThread(supabase, {
        threadId: decoded,
        displayName: "친구",
        userId,
      });
      thread = ensured.thread;
    }

    const roomKind =
      thread.room_kind ?? (isGroupThreadId(thread.id) ? "group" : "dm");

    return NextResponse.json({
      threadId: thread.id,
      inviteCode: thread.invite_code,
      displayName: thread.display_name,
      roomKind,
      aiMode: thread.ai_mode ?? (roomKind === "group" ? "shared" : "private"),
    });
  } catch (error) {
    return peerApiErrorResponse(error, "대화방을 열 수 없어요.");
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
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

  if (!isGroupThreadId(decoded)) {
    return NextResponse.json(
      { error: "not_group", message: "단톡 방만 이름을 바꿀 수 있어요." },
      { status: 400 },
    );
  }

  try {
    const body = (await request.json()) as { displayName?: string };
    const displayName = body.displayName?.trim();
    if (!displayName) {
      return NextResponse.json(
        { error: "displayName required." },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const nextName = await renameGroupThread(supabase, {
      threadId: decoded,
      displayName,
    });

    return NextResponse.json({
      threadId: decoded,
      displayName: nextName,
      roomKind: "group" as const,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("forbidden")) {
      return NextResponse.json(
        { error: "forbidden", message: "이 대화방 이름을 바꿀 수 없어요." },
        { status: 403 },
      );
    }
    return peerApiErrorResponse(error, "방 이름을 바꾸지 못했어요.");
  }
}
