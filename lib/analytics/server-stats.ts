import type { SupabaseClient } from "@supabase/supabase-js";
import {
  aggregateActionClickStats,
  type ActionClickAggregate,
} from "@/lib/analytics/rank-boost";
import type { BlinkAnalyticsEvent } from "@/lib/analytics/types";
import type { Database } from "@/types/database";

type AnalyticsClickRow = {
  domain: string | null;
  enricher_id: string | null;
  payload: {
    actionLabel?: string;
    actionKind?: string;
    surface?: string;
  } | null;
  ts: string;
  session_id: string;
  flow_id: string | null;
};

export async function fetchAnalyticsClickStats(
  supabase: SupabaseClient<Database>
): Promise<ActionClickAggregate | null> {
  const { data, error } = await supabase
    .from("analytics_events")
    .select("domain, enricher_id, payload, ts, session_id, flow_id")
    .eq("event_type", "action_click")
    .order("ts", { ascending: false })
    .limit(500);

  if (error || !data?.length) {
    return null;
  }

  const events = (data as AnalyticsClickRow[]).flatMap((row) => {
    const label = row.payload?.actionLabel;
    const kind = row.payload?.actionKind;

    if (!label || !kind) {
      return [];
    }

    const event: Extract<BlinkAnalyticsEvent, { type: "action_click" }> = {
      type: "action_click",
      ts: new Date(row.ts).getTime(),
      sessionId: row.session_id,
      flowId: row.flow_id,
      surface: "now",
      domain: row.domain ?? "",
      enricher_id: row.enricher_id,
      source_type: null,
      actionLabel: label,
      actionKind: kind,
      hadCopyText: false,
      copySucceeded: false,
    };

    return [event];
  });

  if (events.length === 0) {
    return null;
  }

  return aggregateActionClickStats(events);
}
