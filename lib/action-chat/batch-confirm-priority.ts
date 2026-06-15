import {
  actionAgentBatchToItems,
  processActionAgentBatch,
} from "@/lib/action-chat/action-agent-batch";
import { tryActionAgentBatch } from "@/lib/action-chat/orchestrate-action-agent-batch";
import {
  assessPlaceConfirmationNeed,
  buildConfirmationOrchestratorResult,
} from "@/lib/action-chat/confirmation-logic";
import { generatePersonaConfirmMessage } from "@/lib/action-chat/confirm-message-generator";
import { sanitizePlaceNameForNavigation } from "@/lib/action-chat/resolve-navigation-place";
import { resolveActionAgentReferenceDate } from "@/lib/action-chat/action-agent-prompt";
import { orchestrateTimeDecision } from "@/lib/time-decision/orchestrate-time-decision";
import { isScheduleListBatchCandidate } from "@/lib/schedule/parse-schedule-list-batch";
import { isNonLocationActionCommand } from "@/lib/action-chat/is-non-location-action";
import { isPlaceRecommendationQuery } from "@/lib/context-resolver/discovery/parse-find-place-intent";
import type { LocationConfirmUxWire } from "@/lib/action-chat/confirmation-types";
import type { OrchestratorResult } from "@/lib/action-chat/orchestrator-types";
import type { ExistingScheduleInput } from "@/lib/schedule/day-schedule";

export type PlaceConfirmEnrichment = {
  location_ux: LocationConfirmUxWire;
};

function buildPlaceConfirmResult(input: {
  message: string;
  referenceDate: string;
  enrichment?: PlaceConfirmEnrichment;
}): OrchestratorResult | null {
  const confirm = assessPlaceConfirmationNeed({
    message: input.message,
    referenceDate: input.referenceDate,
  });

  if (!confirm?.needsConfirm) {
    return null;
  }

  const batchWire = processActionAgentBatch(input.message, {
    referenceDate: input.referenceDate,
  });
  const batchItems =
    batchWire && batchWire.results.length > 0
      ? actionAgentBatchToItems(batchWire)
      : [];

  const pending = batchItems.filter(
    (item) => item.type !== "ADDRESS" && item.type !== "PLACE"
  );

  const subject =
    sanitizePlaceNameForNavigation(confirm.extracted_data.place_name, input.message) ??
    confirm.extracted_data.address?.slice(0, 24) ??
    "선택한 장소";

  const ux = input.enrichment?.location_ux;
  const hasSearchUx = ux && ux.mode !== "classic" && ux.suggestions.length > 0;

  const persona_message = generatePersonaConfirmMessage({
    locationLabel: subject,
    category: "PLACE",
    hasBatchPending: pending.length > 0,
    referenceDate: input.referenceDate,
  });

  const thought =
    pending.length > 0
      ? `Found: ${subject}·${pending.map((p) => p.type).join("·")}. Intent: 장소 확인 후 ${pending.length}건 처리. Missing: ${subject} 정확한 지점.`
      : `Found: ${subject}. Intent: 장소 확인 후 실행. Missing: ${subject} 정확한 지점.`;

  const data_prompt = hasSearchUx ? ux.prompt : confirm.data_prompt;

  return buildConfirmationOrchestratorResult({
    persona_message,
    data_prompt,
    extracted_data: confirm.extracted_data,
    confidence: confirm.confidence,
    thought,
    confirm_data: {
      subject,
      category: "PLACE",
    },
    batch_pending: pending.map((item) => ({
      type: item.type,
      summary: item.summary,
      extracted_data: item.extracted_data,
    })),
    location_suggestions: ux?.suggestions,
    location_ux: ux,
  });
}

/**
 * Priority 0: ambiguous place CONFIRM roots the turn.
 * Confirmed batch items (phone, datetime, …) defer to batch_pending.
 */
export function tryBatchConfirmPriority(input: {
  message: string;
  referenceDate?: string | null;
  existingSchedule?: ExistingScheduleInput;
}): OrchestratorResult | null {
  const message = input.message.trim();
  if (!message) {
    return null;
  }

  const referenceDate = resolveActionAgentReferenceDate(input.referenceDate);

  if (isScheduleListBatchCandidate(message)) {
    return null;
  }

  if (isNonLocationActionCommand(message)) {
    return null;
  }

  if (isPlaceRecommendationQuery(message)) {
    return null;
  }

  const timeDecision = orchestrateTimeDecision({ message, referenceDate });
  if (timeDecision?.timeChoice || timeDecision?.scheduledDelivery) {
    return timeDecision;
  }

  const confirmResult = buildPlaceConfirmResult({ message, referenceDate });

  if (confirmResult) {
    return confirmResult;
  }

  const batchWire = processActionAgentBatch(message, { referenceDate });
  if (batchWire && batchWire.results.length >= 2) {
    return tryActionAgentBatch({
      message,
      referenceDate,
      existingSchedule: input.existingSchedule,
    });
  }

  return null;
}

export { buildPlaceConfirmResult };
