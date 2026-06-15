import { NextResponse, type NextRequest } from "next/server";
import { requireAuthUser } from "@/lib/auth/api-auth";
import { declineBridgeInvite } from "@/lib/experience-bridge";
import {
  fetchExperienceBridgeState,
  updateBridgeParticipantRow,
} from "@/lib/experience-bridge/server-bridge-store";
import { extractErrorMessage } from "@/lib/peer-chat/extract-error-message";
import { toBridgeStateWire } from "@/lib/experience-bridge/wire-bridge-response-dto";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ eventId: string }>;
};

export async function POST(_request: NextRequest, context: RouteContext) {
  const { eventId } = await context.params;
  const key = decodeURIComponent(eventId).trim();

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
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
    const state = await fetchExperienceBridgeState(supabase, key);
    if (!state) {
      return NextResponse.json({ error: "Bridge not found." }, { status: 404 });
    }

    const next = declineBridgeInvite(state, { userId });
    const declined = next.participants.find((row) => row.userId === userId);
    if (declined) {
      await updateBridgeParticipantRow(supabase, key, declined);
    }

    return NextResponse.json({ state: toBridgeStateWire(next) });
  } catch (error) {
    const message = extractErrorMessage(error, "Failed to decline invite.");
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
