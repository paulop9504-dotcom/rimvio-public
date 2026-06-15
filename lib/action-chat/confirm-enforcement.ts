import { tryBatchConfirmPriority } from "@/lib/action-chat/batch-confirm-priority";
import { tryPlaceConfirmation } from "@/lib/action-chat/confirmation-logic";
import {
  hasMisplacedPlaceConfirm,
  stripMisplacedPlaceConfirm,
} from "@/lib/action-chat/reconcile-recommendation-result";
import { enrichPlaceDiscoveryMessage } from "@/lib/context-resolver/discovery/enrich-place-discovery-message";
import { isPlaceRecommendationQuery } from "@/lib/context-resolver/discovery/parse-find-place-intent";
import { isNonLocationActionCommand } from "@/lib/action-chat/is-non-location-action";
import type {
  OrchestrateHistoryTurn,
  OrchestratorResult,
} from "@/lib/action-chat/orchestrator-types";
import type { ExistingScheduleInput } from "@/lib/schedule/day-schedule";

const MISSING_IN_THOUGHT = /Missing\s*:/i;

const FALSE_COMPLETION_SUMMARY =
  /^(?:확인\s*완료(?:했(?:어요|습니다|음)?)?|처리\s*완료(?:했(?:어요|습니다|음)?)?|등록\s*완료(?:했(?:어요|습니다|음)?)?|완료했(?:어요|습니다|음)?|done|confirmed)(?:[!?.~ㅋㅎ\s]*)?$/iu;

export function hasMissingInThought(thought?: string | null): boolean {
  return Boolean(thought && MISSING_IN_THOUGHT.test(thought));
}

export function isFalseCompletionSummary(summary: string): boolean {
  return FALSE_COMPLETION_SUMMARY.test(summary.trim());
}

/**
 * Reporting → Triggering: Missing/thought-only turns must emit CONFIRM wire, not text completion.
 */
export function enforceConfirmationTrigger(input: {
  message: string;
  history?: readonly OrchestrateHistoryTurn[];
  result: OrchestratorResult;
  referenceDate?: string;
  existingSchedule?: ExistingScheduleInput;
}): OrchestratorResult {
  const { message, result } = input;
  const thought = result.thought ?? result.confirmation?.thought;
  const hasConfirmWire = result.confirmation?.meta?.intent === "CONFIRM";
  const missingDetected = hasMissingInThought(thought);
  const falseComplete = isFalseCompletionSummary(result.summary);

  const discoveryMessage = enrichPlaceDiscoveryMessage(message, input.history);
  if (isPlaceRecommendationQuery(discoveryMessage)) {
    if (hasConfirmWire || hasMisplacedPlaceConfirm(result)) {
      return stripMisplacedPlaceConfirm(result);
    }
    return result;
  }

  if (hasConfirmWire) {
    return result;
  }

  if (!missingDetected && !falseComplete) {
    return result;
  }

  if (isNonLocationActionCommand(message)) {
    return result;
  }

  const ruleConfirm = tryBatchConfirmPriority({
    message,
    referenceDate: input.referenceDate,
    existingSchedule: input.existingSchedule,
  });

  if (ruleConfirm?.confirmation?.meta.intent === "CONFIRM") {
    return {
      ...ruleConfirm,
      thought: thought ?? ruleConfirm.thought,
      source: result.source,
    };
  }

  const placeConfirm = tryPlaceConfirmation({
    message,
    referenceDate: input.referenceDate,
    history: input.history,
  });

  if (placeConfirm?.confirmation?.meta.intent === "CONFIRM") {
    return {
      ...placeConfirm,
      thought: thought ?? placeConfirm.thought,
      source: result.source,
    };
  }

  if (missingDetected || falseComplete) {
    return {
      ...result,
      summary: "장소 확인이 필요해요. 아래에서 확인해 주세요.",
      actions: [],
      pendingConfirm: true,
      actionsRevealed: false,
      disclosure: "high",
    };
  }

  return result;
}
