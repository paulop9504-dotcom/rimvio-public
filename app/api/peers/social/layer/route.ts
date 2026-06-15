import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/api-auth";
import {
  listSocialLayer,
  purgeExpiredArchiveMessages,
} from "@/lib/peer-chat/friend-connections-server";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ pinned: [], archive: [] });
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
    const supabase = await createClient();
    await purgeExpiredArchiveMessages(supabase, userId);
    const layer = await listSocialLayer(supabase, userId);
    return NextResponse.json(layer);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load social layer.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
