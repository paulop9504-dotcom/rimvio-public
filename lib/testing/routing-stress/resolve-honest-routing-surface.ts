import type { OrchestratorResult } from "@/lib/action-chat/orchestrator-types";
import type { RoutingSurface } from "@/lib/action-chat/classify-semantic-routing-surface";
import { classifyAiIntentUtterance } from "@/lib/action-chat/classify-ai-intent-utterance";

const GENERIC_CLARIFY = "무엇을 도와드릴까요?";

function countForkOptions(result: OrchestratorResult): number {
  const discoveryFork =
    (result.cafeDiscovery?.options?.length ?? 0) +
    (result.entityQuickPick?.options?.length ?? 0) +
    (result.experienceChoice?.options?.length ?? 0);

  const meta = result.metadata as
    | { semantic_reason?: string; event_intent?: string }
    | undefined;
  const mealCriterionFork =
    meta?.semantic_reason === "commit_gate_slot_collect" &&
    meta?.event_intent === "meal" &&
    (result.actions?.length ?? 0) >= 2
      ? result.actions!.length
      : 0;

  return discoveryFork > 0 ? discoveryFork : mealCriterionFork;
}

/** Honest projection from pipeline output — no semantic override (for stress tests). */
export function resolveHonestRoutingSurface(
  message: string,
  result: OrchestratorResult
): RoutingSurface {
  const summary = result.summary?.trim() ?? "";

  if (summary === GENERIC_CLARIFY && countForkOptions(result) === 0 && !result.actions?.length) {
    return "INFO";
  }

  if (countForkOptions(result) > 0) {
    return "FORK";
  }

  if (result.experienceChoice) {
    return "REFLECT";
  }

  if (/잘\s*하고|힘든?|스트레스|지치|괜찮아요/u.test(summary)) {
    return "REFLECT";
  }

  const aiIntent = classifyAiIntentUtterance(message);
  const metaIntent = result.metadata?.ai_intent as string | undefined;
  const effectiveIntent = aiIntent ?? metaIntent ?? null;

  if (effectiveIntent === "HOW_TO") return "STEP";
  if (effectiveIntent === "DECISION") return "DECISION";
  if (effectiveIntent === "CREATION") return "ARTIFACT";
  if (effectiveIntent === "COUNSELING") return "REFLECT";
  if (effectiveIntent === "CURIOSITY" || effectiveIntent === "INFO") return "INFO";

  if (result.source === "conversation" || result.presentation?.mode === "conversation") {
    return "INFO";
  }

  if (result.actions?.length) {
    return "STEP";
  }

  return "INFO";
}
