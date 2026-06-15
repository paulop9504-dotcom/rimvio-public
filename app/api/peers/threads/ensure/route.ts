import { NextResponse, type NextRequest } from "next/server";
import { requireAuthUser } from "@/lib/auth/api-auth";
import { peerApiErrorResponse } from "@/lib/peer-chat/peer-api-errors";
import { ensurePeerThread } from "@/lib/peer-chat/server-peer-chat";
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
      threadId?: string;
      displayName?: string;
    };

    const threadId = body.threadId?.trim();
    if (!threadId) {
      return NextResponse.json({ error: "threadId required." }, { status: 400 });
    }

    const supabase = await createClient();
    const { thread } = await ensurePeerThread(supabase, {
      threadId,
      displayName: body.displayName?.trim() || "친구",
      userId,
    });

    return NextResponse.json({
      threadId: thread.id,
      inviteCode: thread.invite_code,
      displayName: thread.display_name,
    });
  } catch (error) {
    return peerApiErrorResponse(
      error,
      "가입한 Rimvio 사용자와만 대화할 수 있어요.",
    );
  }
}
