import { NextResponse, type NextRequest } from "next/server";
import { normalizeEnricherContext } from "@/lib/enrichers/context";
import { recordActionBinEvent } from "@/lib/intent/store";
import type { ActionBinEvent } from "@/lib/intent/types";
import { getAuthUserId } from "@/lib/auth/session";
import { tryCreateClient } from "@/lib/supabase/server";

type IntentEventBody = {
  context?: {
    hour?: number;
    installedApps?: string[];
  };
  actionKey?: string;
  event?: ActionBinEvent;
};

export async function POST(request: NextRequest) {
  let body: IntentEventBody;

  try {
    body = (await request.json()) as IntentEventBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.actionKey || !body.event) {
    return NextResponse.json(
      { error: "Missing actionKey or event." },
      { status: 400 }
    );
  }

  if (!["impression", "click", "skip"].includes(body.event)) {
    return NextResponse.json({ error: "Invalid event." }, { status: 400 });
  }

  const supabase = await tryCreateClient();
  if (!supabase) {
    return NextResponse.json({ ok: true, persisted: false });
  }

  try {
    const userId = await getAuthUserId();

    await recordActionBinEvent(supabase, {
      context: normalizeEnricherContext(body.context),
      actionKey: body.actionKey,
      event: body.event,
      userId,
    });

    return NextResponse.json({ ok: true, persisted: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not record event.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
