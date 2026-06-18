import { NextResponse, type NextRequest } from "next/server";
import { normalizeEnricherContext } from "@/lib/enrichers/context";
import type { EnricherContext } from "@/lib/enrichers/types";
import { toContextBin } from "@/lib/intent/context-bin";
import { getAuthUserId } from "@/lib/auth/session";
import { recordPersonalizationClickRpc } from "@/lib/personalization/server-store";
import { tryCreateClient } from "@/lib/supabase/server";

type PersonalizationClickBody = {
  sessionId?: string;
  linkId?: string;
  context?: Partial<EnricherContext>;
  actionKey?: string;
  actionFamily?: string;
  domain?: string;
  domainFamily?: string;
  linkCategory?: string;
  routeMode?: string;
};

export async function POST(request: NextRequest) {
  let body: PersonalizationClickBody;

  try {
    body = (await request.json()) as PersonalizationClickBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.sessionId || !body.actionKey || !body.actionFamily) {
    return NextResponse.json(
      { error: "Missing sessionId, actionKey, or actionFamily." },
      { status: 400 }
    );
  }

  const supabase = await tryCreateClient();
  if (!supabase) {
    return NextResponse.json({ ok: true, persisted: false });
  }

  try {
    const userId = await getAuthUserId();
    const context = normalizeEnricherContext(
      body.context as Partial<EnricherContext> | undefined
    );
    const contextBin = toContextBin(context);

    const profile = await recordPersonalizationClickRpc(supabase, {
      sessionId: body.sessionId,
      userId,
      linkId: body.linkId,
      contextBin,
      actionKey: body.actionKey,
      actionFamily: body.actionFamily,
      domain: body.domain,
      domainFamily: body.domainFamily ?? "generic",
      linkCategory: body.linkCategory,
      routeMode: body.routeMode,
    });

    return NextResponse.json({ ok: true, persisted: true, profile });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not record click.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
