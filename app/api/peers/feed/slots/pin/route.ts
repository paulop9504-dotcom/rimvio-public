import { NextResponse, type NextRequest } from "next/server";
import { requireAuthUser } from "@/lib/auth/api-auth";
import { pinFeedSlot } from "@/lib/peer-chat/relationship-slots-server";
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

  const body = (await request.json()) as {
    roomId?: string;
    pinned?: boolean;
  };

  const roomId = body.roomId?.trim();
  if (!roomId) {
    return NextResponse.json({ error: "roomId required." }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    await pinFeedSlot(supabase, {
      userId,
      roomId,
      pinned: body.pinned !== false,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to pin slot.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
