import {
  buildPlaceConfirmResult,
  type PlaceConfirmEnrichment,
} from "@/lib/action-chat/batch-confirm-priority";
import { tryActionAgentBatch } from "@/lib/action-chat/orchestrate-action-agent-batch";
import { assessPlaceConfirmationNeed } from "@/lib/action-chat/confirmation-logic";
import { resolveActionAgentReferenceDate } from "@/lib/action-chat/action-agent-prompt";
import { planLocationConfirmUx } from "@/lib/corrections/location-confirm-ux";
import {
  planPriorPlaceConfirmUx,
  type PriorPlaceChoiceWire,
} from "@/lib/corrections/prior-place-choice";
import { resolveLocationSuggestionsForConfirm } from "@/lib/corrections/resolve-location-suggestions";
import type { LocationMemoryWire } from "@/lib/location-memory/types";
import type { OrchestratorResult } from "@/lib/action-chat/orchestrator-types";
import type { ExistingScheduleInput } from "@/lib/schedule/day-schedule";
import { processActionAgentBatch } from "@/lib/action-chat/action-agent-batch";
import { isScheduleListBatchCandidate } from "@/lib/schedule/parse-schedule-list-batch";
import { isShadowDashboardQuery } from "@/lib/notification-shadow/compile-dashboard";

/**
 * Missing place → Naver search → low-friction pick UX (first turn).
 */
export async function orchestratePlaceConfirm(input: {
  message: string;
  referenceDate?: string | null;
  existingSchedule?: ExistingScheduleInput;
  locationMemory?: LocationMemoryWire | null;
  priorPlaceChoice?: PriorPlaceChoiceWire | null;
}): Promise<OrchestratorResult | null> {
  const message = input.message.trim();
  if (!message) {
    return null;
  }

  if (isShadowDashboardQuery(message)) {
    return null;
  }

  if (isScheduleListBatchCandidate(message)) {
    return null;
  }

  const referenceDate = resolveActionAgentReferenceDate(input.referenceDate);
  const assessment = assessPlaceConfirmationNeed({ message, referenceDate });

  if (!assessment?.needsConfirm) {
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

  const subject =
    assessment.extracted_data.place_name?.trim() ||
    input.priorPlaceChoice?.matched_intent ||
    "장소";

  if (input.priorPlaceChoice?.suggestion) {
    const location_ux = planPriorPlaceConfirmUx({
      prior: input.priorPlaceChoice.suggestion,
      subject,
    });

    return buildPlaceConfirmResult({
      message,
      referenceDate,
      enrichment: { location_ux },
    });
  }

  const suggestions = await resolveLocationSuggestionsForConfirm({
    extracted: assessment.extracted_data,
    message,
    maxResults: 5,
    lifeZoneLabel: input.locationMemory?.lifeZone?.label ?? null,
  });

  const location_ux = planLocationConfirmUx({
    suggestions,
    extracted: assessment.extracted_data,
    message,
  });

  const enrichment: PlaceConfirmEnrichment = { location_ux };

  return buildPlaceConfirmResult({
    message,
    referenceDate,
    enrichment,
  });
}
