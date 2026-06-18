/**
 * Scope AI orchestrator gate — block Creator on internal, Guardian on external.
 * @see docs/RIMVIO_SCOPE_AI.md
 */

import type { ChatAxis } from "@/lib/action-chat/chat-three-axis";
import type { OrchestrateHistoryTurn } from "@/lib/action-chat/orchestrator-types";
import { enrichPlaceDiscoveryMessage } from "@/lib/context-resolver/discovery/enrich-place-discovery-message";
import { isPlaceRecommendationQuery } from "@/lib/context-resolver/discovery/parse-find-place-intent";
import type { PinScope } from "@/lib/globe/pin-entity";
import { resolveScopeAiPolicy } from "@/lib/scope-ai/scope-ai-policy";
import type {
  ScopeAiCapability,
  ScopeAiGateResult,
} from "@/lib/scope-ai/scope-ai-types";
import { resolvePinScope } from "@/lib/scope-ai/resolve-pin-scope";

const CREATOR_LIFE_PLAN_SIGNAL =
  /(?:창업|이직|커리어|진로|인생\s*플랜|목표\s*세우|10년\s*계획)/iu;

const EXTERNAL_COMPOSE_SIGNAL =
  /(?:여행|루트|일정.*조합|비슷한\s*사람|흔적.*연결|같이\s*가)/iu;

const GUARDIAN_NUDGE_SIGNAL =
  /(?:내일|모레|일정|병원|예약|답장.*안|잊었|잊지\s*마|알림\s*줘|D-?\d)/iu;

export type GateOrchestratorScopeAiInput = {
  scope: PinScope;
  message: string;
  chatAxis?: ChatAxis;
  history?: OrchestrateHistoryTurn[];
};

function isDiscoveryHeroCandidate(
  message: string,
  history?: OrchestrateHistoryTurn[],
): boolean {
  const enriched = enrichPlaceDiscoveryMessage(message, history);
  return (
    isPlaceRecommendationQuery(enriched) ||
    isPlaceRecommendationQuery(message) ||
    EXTERNAL_COMPOSE_SIGNAL.test(message)
  );
}

export function gateOrchestratorScopeAi(
  input: GateOrchestratorScopeAiInput,
): ScopeAiGateResult {
  const scope = resolvePinScope(input.scope);
  const policy = resolveScopeAiPolicy(scope);
  const blocked: ScopeAiCapability[] = [];

  if (scope === "internal") {
    const mealAxisExempt = input.chatAxis === "meal";
    if (!mealAxisExempt && isDiscoveryHeroCandidate(input.message, input.history)) {
      blocked.push("discovery_list_hero", "trace_compose");
    }
    if (CREATOR_LIFE_PLAN_SIGNAL.test(input.message)) {
      blocked.push("intent_override", "life_plan_rewrite");
    }
  } else {
    if (GUARDIAN_NUDGE_SIGNAL.test(input.message)) {
      blocked.push("private_schedule_nudge", "proactive_nudge");
    }
  }

  return {
    scope,
    persona: policy.persona,
    policy,
    blockedCapabilities: blocked,
  };
}

export function scopeAiBlocks(
  gate: ScopeAiGateResult | null | undefined,
  capability: ScopeAiCapability,
): boolean {
  return Boolean(gate?.blockedCapabilities.includes(capability));
}
