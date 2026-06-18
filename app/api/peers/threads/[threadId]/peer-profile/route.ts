import { NextResponse, type NextRequest } from "next/server";
import { requireAuthUser } from "@/lib/auth/api-auth";
import { peerApiErrorResponse } from "@/lib/peer-chat/peer-api-errors";
import { readDmPeerPublicProfile } from "@/lib/peer-chat/peer-public-profile";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ threadId: string }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ profile: null }, { status: 503 });
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
    const profile = await readDmPeerPublicProfile(supabase, {
      threadId: decoded,
      callerUserId: userId,
    });

    if (!profile) {
      return NextResponse.json(
        { error: "not_found", message: "프로필을 불러올 수 없어요." },
        { status: 404 },
      );
    }

    return NextResponse.json({ profile });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("forbidden")) {
      return NextResponse.json(
        { error: "forbidden", message: "이 대화의 프로필을 볼 수 없어요." },
        { status: 403 },
      );
    }
    return peerApiErrorResponse(error, "프로필을 불러오지 못했어요.");
  }
}
