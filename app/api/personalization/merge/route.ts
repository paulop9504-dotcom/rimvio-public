import { NextResponse, type NextRequest } from "next/server";
import { getAuthUserId } from "@/lib/auth/session";
import {
  fetchRecentProfile,
  mergeGuestPersonalizationRpc,
} from "@/lib/personalization/server-store";
import { tryCreateClient } from "@/lib/supabase/server";

type MergeBody = {
  sessionId?: string;
};

export async function POST(request: NextRequest) {
  let body: MergeBody;

  try {
    body = (await request.json()) as MergeBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  if (!body.sessionId) {
    return NextResponse.json({ error: "Missing sessionId." }, { status: 400 });
  }

  const supabase = await tryCreateClient();
  if (!supabase) {
    return NextResponse.json({ ok: true, persisted: false });
  }

  try {
    const result = await mergeGuestPersonalizationRpc(
      supabase,
      body.sessionId,
      userId
    );

    const profile = await fetchRecentProfile(supabase, {
      userId,
      sessionId: body.sessionId,
    });

    return NextResponse.json({ ok: true, result, profile });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not merge guest data.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
