import { readLifeProjections } from "@/lib/life-read-model/read-life-projections";
import type { EventCandidate } from "@/lib/events/event-candidate";
import {
  rankEventOpportunities,
  type OpportunityScoreBreakdown,
  evaluateEventOpportunities,
} from "@/lib/opportunity-engine/score-event-opportunity";
import type {
  EventOpportunitySignal,
  OpportunityEngineContext,
} from "@/lib/opportunity-engine/types";

export type {
  EventOpportunityPriority,
  EventOpportunitySignal,
  OpportunityEngineContext,
} from "@/lib/opportunity-engine/types";

export {
  evaluateEventOpportunities,
  rankEventOpportunities,
  scoreEventOpportunity,
  toOpportunitySignal,
  type OpportunityScoreBreakdown,
} from "@/lib/opportunity-engine/score-event-opportunity";

/**
 * Read-only entry — scores existing EventCandidates from store.
 * Does NOT create, mutate, or infer events.
 */
export function listRankedEventOpportunities(
  context: OpportunityEngineContext = {},
  events?: readonly EventCandidate[],
): EventOpportunitySignal[] {
  const list = events ?? readLifeProjections().events;
  return rankEventOpportunities(list, context);
}

/** Detailed breakdown for inspection / tests. */
export function listEvaluatedEventOpportunities(
  context: OpportunityEngineContext = {},
  events?: readonly EventCandidate[],
): OpportunityScoreBreakdown[] {
  const list = events ?? readLifeProjections().events;
  return evaluateEventOpportunities(list, context);
}
