import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/api-auth";
import { listPeerThreadsForUser } from "@/lib/peer-chat/server-peer-chat";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ threads: [] });
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
    const threads = await listPeerThreadsForUser(supabase, userId);
    return NextResponse.json({ threads });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list threads.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
