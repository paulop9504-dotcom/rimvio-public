import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/api-auth";
import { listPendingBridgeInvitesForUser } from "@/lib/experience-bridge/server-bridge-store";
import { toBridgeStateWire } from "@/lib/experience-bridge/wire-bridge-response-dto";
import { extractErrorMessage } from "@/lib/peer-chat/extract-error-message";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ invites: [] });
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
    const invites = await listPendingBridgeInvitesForUser(supabase, userId);
    return NextResponse.json({
      invites: invites.map((row) => ({
        state: toBridgeStateWire(row.state),
        invite: row.invite,
      })),
    });
  } catch (error) {
    const message = extractErrorMessage(error, "Failed to load invites.");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
