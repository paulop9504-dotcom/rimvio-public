import { enrichPlaceDiscoveryMessage } from "@/lib/context-resolver/discovery/enrich-place-discovery-message";
import { isPlaceRecommendationQuery } from "@/lib/context-resolver/discovery/parse-find-place-intent";
import { orchestratePlaceRecommendation } from "@/lib/context-resolver/discovery/orchestrate-place-recommendation";
import type { OrchestratorResult } from "@/lib/action-chat/orchestrator-types";
import type { OrchestrateHistoryTurn } from "@/lib/action-chat/orchestrator-types";

export function hasMisplacedPlaceConfirm(result: OrchestratorResult): boolean {
  return (
    result.confirmation?.meta?.intent === "CONFIRM" ||
    (Boolean(result.pendingConfirm) &&
      Boolean(
        result.confirmation?.location_ux || result.confirmation?.location_suggestions?.length
      ))
  );
}

export function stripMisplacedPlaceConfirm(result: OrchestratorResult): OrchestratorResult {
  return {
    ...result,
    pendingConfirm: false,
    confirmation: undefined,
  };
}

/**
 * Discovery queries must never end on branch-confirm UX.
 * Replace misplaced LLM/rule confirm with Naver discovery cards.
 */
export async function reconcileRecommendationOrchestratorResult(input: {
  message: string;
  history?: readonly OrchestrateHistoryTurn[];
  result: OrchestratorResult;
}): Promise<OrchestratorResult> {
  const enriched = enrichPlaceDiscoveryMessage(input.message, input.history);

  if (!isPlaceRecommendationQuery(enriched)) {
    return input.result;
  }

  if (!hasMisplacedPlaceConfirm(input.result)) {
    return input.result;
  }

  const discovery = await orchestratePlaceRecommendation(enriched, {
    history: input.history,
  });
  if (discovery) {
    return {
      ...discovery,
      thought: discovery.thought ?? input.result.thought,
      source: input.result.source ?? discovery.source,
    };
  }

  return stripMisplacedPlaceConfirm(input.result);
}
