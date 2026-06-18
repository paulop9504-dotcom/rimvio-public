import { decideEventBehaviors } from "@/lib/behavior-engine/decide-event-behaviors";
import { listRankedEventOpportunities } from "@/lib/opportunity-engine/rank-event-opportunities";
import type { OpportunityEngineContext } from "@/lib/opportunity-engine/types";
import type {
  BehaviorEngineContext,
  BehaviorEngineResult,
} from "@/lib/behavior-engine/types";

export type {
  BehaviorEngineContext,
  BehaviorEngineResult,
  BehaviorHighlightLevel,
  EventBehaviorPolicy,
} from "@/lib/behavior-engine/types";

export {
  decideBehaviorForOpportunity,
  decideEventBehaviors,
} from "@/lib/behavior-engine/decide-event-behaviors";

/**
 * Compose Opportunity Engine → Behavior Engine (read-only pipeline).
 * Does NOT mutate EventCandidates or recompute opportunity scores.
 */
export function listEventBehaviors(
  opportunityContext: OpportunityEngineContext = {},
  behaviorContext: BehaviorEngineContext = {}
): BehaviorEngineResult {
  const opportunities = listRankedEventOpportunities(opportunityContext);
  if (opportunities.length === 0) {
    return "NO_ACTION";
  }

  return decideEventBehaviors(opportunities, {
    focusedEcId: behaviorContext.focusedEcId ?? opportunityContext.focusedEcId,
    recentEcIds: behaviorContext.recentEcIds ?? opportunityContext.recentEcIds,
  });
}
