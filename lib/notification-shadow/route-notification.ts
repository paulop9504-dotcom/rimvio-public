import { extractFutureActions } from "@/lib/notification-shadow/action-extract";
import {
  computePriorityScore,
  resolveContainer,
  routeFromScore,
} from "@/lib/notification-shadow/priority-engine";
import { ruleClassifyNotification } from "@/lib/notification-shadow/rule-classify";
import type {
  NotificationEventInput,
  ShadowProcessedRecord,
} from "@/lib/notification-shadow/types";

function trimSummary(text: string) {
  return text.replace(/\s+/g, " ").trim().slice(0, 120);
}

export function processNotificationEvent(
  input: NotificationEventInput
): ShadowProcessedRecord {
  const classified = ruleClassifyNotification(input);
  const container = resolveContainer(input);
  const future_actions = extractFutureActions(input);
  const priority_score = computePriorityScore({
    event: input,
    container,
    future_actions,
  });
  const route = routeFromScore(priority_score, classified.category);

  const summary = trimSummary(input.title || input.content);
  const enrichmentConfidence =
    container === "UNKNOWN" ? 0.35 : container === input.active_container ? 0.94 : 0.78;

  return {
    id: `shadow-${crypto.randomUUID()}`,
    ingested_at: new Date().toISOString(),
    source: input.source,
    source_app: input.source_app,
    category: classified.category,
    priority_score,
    route,
    summary,
    reason: classified.reason,
    container,
    future_actions,
    behavior_signal: "UNKNOWN",
    container_enrichment: {
      target_container: container,
      confidence: enrichmentConfidence,
    },
    shadow_record: {
      store: route !== "drop",
      expires_in_hours: route === "shadow" ? 168 : 72,
    },
    raw: input,
  };
}

/** Full pipeline: Rule → Priority → Action → Container → Route */
export function ingestNotification(input: NotificationEventInput): ShadowProcessedRecord {
  return processNotificationEvent(input);
}
