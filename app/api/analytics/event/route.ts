import { NextResponse, type NextRequest } from "next/server";
import { insertAnalyticsEvent } from "@/lib/analytics/server-store";
import type { BlinkAnalyticsEvent } from "@/lib/analytics/types";
import { tryCreateClient } from "@/lib/supabase/server";

const EVENT_TYPES = new Set(["enrich", "action_click", "funnel"]);

function isBlinkAnalyticsEvent(value: unknown): value is BlinkAnalyticsEvent {
  if (!value || typeof value !== "object") {
    return false;
  }

  const event = value as BlinkAnalyticsEvent;

  if (
    typeof event.ts !== "number" ||
    typeof event.sessionId !== "string" ||
    !EVENT_TYPES.has(event.type)
  ) {
    return false;
  }

  if (event.flowId !== null && typeof event.flowId !== "string") {
    return false;
  }

  return true;
}

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!isBlinkAnalyticsEvent(body)) {
    return NextResponse.json({ error: "Invalid analytics event." }, { status: 400 });
  }

  const supabase = await tryCreateClient();
  if (!supabase) {
    return NextResponse.json({ ok: true, persisted: false });
  }

  try {
    await insertAnalyticsEvent(supabase, body);
    return NextResponse.json({ ok: true, persisted: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not record analytics event.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
