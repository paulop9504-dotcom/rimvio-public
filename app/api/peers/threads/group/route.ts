import { NextResponse, type NextRequest } from "next/server";
import { requireAuthUser } from "@/lib/auth/api-auth";
import { peerApiErrorResponse } from "@/lib/peer-chat/peer-api-errors";
import {
  ensureGroupPeerThread,
  resolveGroupMemberUserIds,
} from "@/lib/peer-chat/server-peer-chat";
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
    const body = (await request.json()) as {
      displayName?: string;
      memberThreadIds?: string[];
    };

    const memberThreadIds = (body.memberThreadIds ?? [])
      .map((id) => id.trim())
      .filter(Boolean);

    const memberUserIds = resolveGroupMemberUserIds({
      callerUserId: userId,
      memberThreadIds,
    });

    const supabase = await createClient();
    const { thread, threadId, created } = await ensureGroupPeerThread(supabase, {
      displayName: body.displayName?.trim() || "단톡",
      ownerUserId: userId,
      memberUserIds,
    });

    return NextResponse.json({
      threadId,
      inviteCode: thread.invite_code,
      displayName: thread.display_name,
      roomKind: "group" as const,
      created,
    });
  } catch (error) {
    return peerApiErrorResponse(error, "단톡을 만들 수 없어요.");
  }
}
