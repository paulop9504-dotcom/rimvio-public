import { NextResponse, type NextRequest } from "next/server";
import { getAuthUserId } from "@/lib/auth/session";
import { recordLinkReopenRpc } from "@/lib/personalization/server-store";
import { tryCreateClient } from "@/lib/supabase/server";

type ReopenBody = {
  sessionId?: string;
  linkId?: string;
  domainFamily?: string;
  linkCategory?: string;
};

export async function POST(request: NextRequest) {
  let body: ReopenBody;

  try {
    body = (await request.json()) as ReopenBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.sessionId || !body.linkId) {
    return NextResponse.json(
      { error: "Missing sessionId or linkId." },
      { status: 400 }
    );
  }

  const supabase = await tryCreateClient();
  if (!supabase) {
    return NextResponse.json({ ok: true, persisted: false });
  }

  try {
    const userId = await getAuthUserId();
    const state = await recordLinkReopenRpc(supabase, {
      sessionId: body.sessionId,
      linkId: body.linkId,
      userId,
      domainFamily: body.domainFamily ?? "generic",
      linkCategory: body.linkCategory,
    });

    return NextResponse.json({ ok: true, persisted: true, state });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not record reopen.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
