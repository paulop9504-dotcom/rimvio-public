import type { SupabaseClient } from "@supabase/supabase-js";
import type { BlinkAnalyticsEvent } from "@/lib/analytics/types";
import type { Database, Json } from "@/types/database";

export type AnalyticsEventInsert =
  Database["public"]["Tables"]["analytics_events"]["Insert"];

export function analyticsEventToInsert(
  event: BlinkAnalyticsEvent
): AnalyticsEventInsert {
  const ts = new Date(event.ts).toISOString();

  if (event.type === "enrich") {
    return {
      event_type: event.type,
      ts,
      session_id: event.sessionId,
      flow_id: event.flowId,
      domain: event.domain,
      enricher_id: event.enricher_id,
      payload: {
        source_type: event.source_type,
        titleFromDomain: event.titleFromDomain,
        imageFromFallback: event.imageFromFallback,
      } satisfies Json as Json,
    };
  }

  if (event.type === "action_click") {
    return {
      event_type: event.type,
      ts,
      session_id: event.sessionId,
      flow_id: event.flowId,
      domain: event.domain,
      enricher_id: event.enricher_id,
      payload: {
        surface: event.surface,
        source_type: event.source_type,
        actionLabel: event.actionLabel,
        actionKind: event.actionKind,
        hadCopyText: event.hadCopyText,
        copySucceeded: event.copySucceeded,
      } satisfies Json as Json,
    };
  }

  return {
    event_type: event.type,
    ts,
    session_id: event.sessionId,
    flow_id: event.flowId,
    domain: event.domain,
    enricher_id: event.enricher_id,
    payload: {
      step: event.step,
    } satisfies Json as Json,
  };
}

export async function insertAnalyticsEvent(
  supabase: SupabaseClient<Database>,
  event: BlinkAnalyticsEvent
) {
  const row = analyticsEventToInsert(event);
  const { error } = await supabase.from("analytics_events").insert(row);

  if (error) {
    throw error;
  }
}

export async function insertAnalyticsEvents(
  supabase: SupabaseClient<Database>,
  events: BlinkAnalyticsEvent[]
) {
  if (events.length === 0) {
    return;
  }

  const rows = events.map(analyticsEventToInsert);
  const { error } = await supabase.from("analytics_events").insert(rows);

  if (error) {
    throw error;
  }
}
