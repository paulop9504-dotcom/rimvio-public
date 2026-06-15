import { NextResponse, type NextRequest } from "next/server";
import { normalizeEnricherContext } from "@/lib/enrichers/context";
import { toContextBin } from "@/lib/intent/context-bin";
import { getAuthUserId } from "@/lib/auth/session";
import {
  recordPersonalizationClickRpc,
  recordUserActionEventRpc,
} from "@/lib/personalization/server-store";
import type { UserActionEventKind } from "@/lib/personalization/action-metadata";
import { tryCreateClient } from "@/lib/supabase/server";
import type { EnricherContext } from "@/lib/enrichers/types";
import type { Json } from "@/types/database";

type PersonalizationEventBody = {
  sessionId?: string;
  event?: UserActionEventKind;
  linkId?: string;
  actionKey?: string;
  actionFamily?: string;
  domain?: string;
  domainFamily?: string;
  linkCategory?: string;
  contextBin?: string;
  routeMode?: string | null;
  metadata?: Json;
  updateProfile?: boolean;
  context?: Partial<EnricherContext>;
};

const EVENTS = new Set<UserActionEventKind>([
  "impression",
  "click",
  "skip",
  "dismiss",
  "defer",
  "yield",
]);

export async function POST(request: NextRequest) {
  let body: PersonalizationEventBody;

  try {
    body = (await request.json()) as PersonalizationEventBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.sessionId || !body.actionKey || !body.actionFamily || !body.event) {
    return NextResponse.json(
      { error: "Missing sessionId, actionKey, actionFamily, or event." },
      { status: 400 }
    );
  }

  if (!EVENTS.has(body.event)) {
    return NextResponse.json({ error: "Invalid event type." }, { status: 400 });
  }

  const supabase = await tryCreateClient();
  if (!supabase) {
    return NextResponse.json({ ok: true, persisted: false });
  }

  const userId = await getAuthUserId();
  const context = normalizeEnricherContext(body.context);
  const contextBin = body.contextBin ?? toContextBin(context);
  const metadata = (body.metadata ?? {}) as Json;

  try {
    if (body.event === "click" && body.updateProfile) {
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
        metadata,
      });

      return NextResponse.json({ ok: true, persisted: true, profile });
    }

    await recordUserActionEventRpc(supabase, {
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
      event: body.event,
      metadata,
    });

    return NextResponse.json({ ok: true, persisted: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not record action event.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
