import { NextResponse, type NextRequest } from "next/server";
import { requireAuthUser } from "@/lib/auth/api-auth";
import { isGroupThreadId } from "@/lib/peer-chat/group-thread";
import { peerApiErrorResponse } from "@/lib/peer-chat/peer-api-errors";
import {
  addMembersToGroupThread,
  listPeerThreadMembers,
  resolveGroupMemberUserIds,
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
    const members = await listPeerThreadMembers(supabase, {
      threadId: decoded,
      callerUserId: userId,
    });

    return NextResponse.json({ members });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("forbidden")) {
      return NextResponse.json(
        { error: "forbidden", message: "이 대화방 멤버 목록을 볼 수 없어요." },
        { status: 403 },
      );
    }
    return peerApiErrorResponse(error, "멤버 목록을 불러오지 못했어요.");
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

  if (!isGroupThreadId(decoded)) {
    return NextResponse.json(
      { error: "not_group", message: "단톡 방에서만 멤버를 추가할 수 있어요." },
      { status: 400 },
    );
  }

  try {
    const body = (await request.json()) as { memberThreadIds?: string[] };
    const memberThreadIds = (body.memberThreadIds ?? [])
      .map((id) => id.trim())
      .filter(Boolean);

    if (memberThreadIds.length === 0) {
      return NextResponse.json(
        { error: "memberThreadIds required." },
        { status: 400 },
      );
    }

    const memberUserIds = resolveGroupMemberUserIds({
      callerUserId: userId,
      memberThreadIds,
    });

    const supabase = await createClient();
    const { addedUserIds } = await addMembersToGroupThread(supabase, {
      threadId: decoded,
      callerUserId: userId,
      memberUserIds,
    });

    const members = await listPeerThreadMembers(supabase, {
      threadId: decoded,
      callerUserId: userId,
    });

    return NextResponse.json({ addedUserIds, members });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("forbidden")) {
      return NextResponse.json(
        { error: "forbidden", message: "이 대화방에 멤버를 추가할 수 없어요." },
        { status: 403 },
      );
    }
    return peerApiErrorResponse(error, "멤버를 추가하지 못했어요.");
  }
}
