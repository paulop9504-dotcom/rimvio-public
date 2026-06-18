import { buildExtractedDataFromText } from "@/lib/action-chat/confirmation-logic";
import { parseRelativeDateTimeFromText } from "@/lib/action-chat/action-agent-normalize";
import { resolveNavigationPlaceName } from "@/lib/action-chat/resolve-navigation-place";
import {
  formatScheduledDeliverySummary,
  isFutureScheduledDatetime,
  type ScheduledActionDelivery,
} from "@/lib/action-chat/scheduled-action-delivery";
import type { OrchestratorResult } from "@/lib/action-chat/orchestrator-types";

const TRAVEL_INTENT = /(?:가야|갈\s*거|가\s*야|출발|이동|행|만날|볼\s*거)/i;

/**
 * Clear timed travel (e.g. "3분뒤 수서역 가야됨") → calendar commit + deferred nav actions.
 * Skips CONFIRM when station + relative time are explicit.
 */
export function tryScheduledTravelAction(input: {
  message: string;
  referenceDate?: string;
}): OrchestratorResult | null {
  const message = input.message.trim();
  if (!message || !TRAVEL_INTENT.test(message)) {
    return null;
  }

  const referenceDate = input.referenceDate ?? new Date().toISOString().slice(0, 10);
  const datetime = parseRelativeDateTimeFromText(message, referenceDate);
  if (!datetime || !isFutureScheduledDatetime(datetime)) {
    return null;
  }

  const extracted = buildExtractedDataFromText(message, referenceDate);
  const placeLabel = resolveNavigationPlaceName(message) ?? extracted.place_name;

  if (!placeLabel) {
    return null;
  }

  const extractedWithPlace = {
    ...extracted,
    place_name: placeLabel,
    datetime,
  };

  const scheduledDelivery: ScheduledActionDelivery = {
    fire_at: datetime,
    status: "pending",
  };

  return {
    summary: formatScheduledDeliverySummary({ placeLabel, fireAt: datetime, jit: true }),
    actions: [],
    source: "rules",
    confidence: 0.92,
    disclosure: "high",
    actionsRevealed: false,
    pendingConfirm: false,
    scheduledDelivery,
    scheduleExtract: extractedWithPlace,
    metadata: {
      intent: "SCHEDULE",
      trust_level_adjustment: "NONE",
    },
  };
}
