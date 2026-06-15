import { NextResponse, type NextRequest } from "next/server";
import { requireAuthUser } from "@/lib/auth/api-auth";
import { isGroupThreadId } from "@/lib/peer-chat/group-thread";
import { peerApiErrorResponse } from "@/lib/peer-chat/peer-api-errors";
import { leaveGroupThread } from "@/lib/peer-chat/server-peer-chat";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ threadId: string }>;
};

export async function POST(_request: NextRequest, context: RouteContext) {
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
      { error: "not_group", message: "단톡 방에서만 나갈 수 있어요." },
      { status: 400 },
    );
  }

  try {
    const supabase = await createClient();
    await leaveGroupThread(supabase, {
      threadId: decoded,
      userId,
    });

    return NextResponse.json({ ok: true, threadId: decoded });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("forbidden")) {
      return NextResponse.json(
        { error: "forbidden", message: "이 대화방에서 나갈 수 없어요." },
        { status: 403 },
      );
    }
    return peerApiErrorResponse(error, "대화방에서 나가지 못했어요.");
  }
}
