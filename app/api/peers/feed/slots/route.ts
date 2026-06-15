import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/api-auth";
import { listRelationshipFeedSlots } from "@/lib/peer-chat/relationship-slots-server";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export async function GET() {
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
    const supabase = await createClient();
    const slots = await listRelationshipFeedSlots(supabase, userId);
    return NextResponse.json({ slots });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load feed slots.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
