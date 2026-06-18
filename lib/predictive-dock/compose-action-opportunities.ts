import {
  MAX_ACTION_OPPORTUNITIES,
  type ActionOpportunityState,
  type ConversationIntentDomain,
} from "@/lib/predictive-dock/action-opportunity-types";
import { applyMainAuxToDockWire } from "@/lib/action-decision/apply-tier-to-dock-wire";
import {
  resolveOpportunityState,
  scoreActionOpportunity,
} from "@/lib/predictive-dock/score-action-opportunity";
import type {
  PredictiveDockAction,
  PredictiveDockWire,
} from "@/lib/predictive-dock/types";
import type { CanonicalContainerKey } from "@/lib/containers/container-types";

export type FinalizeOpportunitiesInput = {
  wire: PredictiveDockWire;
  intent: ConversationIntentDomain;
  activeChains?: readonly CanonicalContainerKey[];
  consumedOpportunityIds?: readonly string[];
  minutesUntilAnchor?: number | null;
  /** Archive rollup context — e.g. `event.travel.mention:navigate`. */
  ranking_context_key?: string;
};

function flattenWire(wire: PredictiveDockWire): PredictiveDockAction[] {
  const items: PredictiveDockAction[] = [];
  if (wire.main_action) {
    items.push(wire.main_action);
  }
  for (const shadow of wire.shadow_actions) {
    if (!items.some((item) => item.id === shadow.id)) {
      items.push(shadow);
    }
  }
  return items;
}

function withResolvedState(
  action: PredictiveDockAction,
  state: ActionOpportunityState
): PredictiveDockAction {
  if (state === "HIDDEN" || state === "EXPIRED") {
    return { ...action, state: "ARCHIVED", opportunityState: state };
  }
  return {
    ...action,
    state: state === "ACTIVE" ? "ACTIVE" : "WARM",
    opportunityState: state,
  };
}

/** Score · filter · cap — Rimvio Action Opportunity composer. */
export function finalizeActionOpportunities(
  input: FinalizeOpportunitiesInput
): PredictiveDockWire {
  const consumed = new Set(input.consumedOpportunityIds ?? []);

  const scored = flattenWire(input.wire)
    .map((action) => {
      const breakdown = scoreActionOpportunity({
        action,
        intent: input.intent,
        activeChains: input.activeChains,
        minutesUntilAnchor: input.minutesUntilAnchor ?? null,
      });
      const opportunityState = resolveOpportunityState({
        action,
        breakdown,
        minutesUntilAnchor: input.minutesUntilAnchor ?? null,
        consumed: consumed.has(action.id),
      });
      return {
        action: withResolvedState(action, opportunityState),
        breakdown,
        opportunityState,
      };
    })
    .filter((entry) => entry.opportunityState !== "HIDDEN")
    .filter((entry) => entry.opportunityState !== "EXPIRED")
    .sort((left, right) => right.breakdown.composite - left.breakdown.composite)
    .slice(0, MAX_ACTION_OPPORTUNITIES + 1);

  return applyMainAuxToDockWire({
    actions: scored.map((entry) => entry.action),
    minutes_until_event: input.minutesUntilAnchor ?? null,
    ranking_context_key: input.ranking_context_key,
  });
}

export function visibleActionOpportunities(
  wire: PredictiveDockWire
): PredictiveDockAction[] {
  const items: PredictiveDockAction[] = [];

  if (wire.main_action && wire.main_action.opportunityState !== "EXPIRED") {
    items.push(wire.main_action);
  }

  for (const shadow of wire.shadow_actions) {
    if (shadow.opportunityState === "EXPIRED") {
      continue;
    }
    if (items.some((item) => item.id === shadow.id)) {
      continue;
    }
    items.push(shadow);
    if (items.length >= 1 + MAX_ACTION_OPPORTUNITIES) {
      break;
    }
  }

  return items;
}
