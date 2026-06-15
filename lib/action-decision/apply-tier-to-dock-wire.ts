import {
  predictiveDockActionToCandidate,
} from "@/lib/action-decision/adapt-predictive-dock";
import { splitMainAuxActionsWithExplain } from "@/lib/action-decision/split-main-aux-actions";
import { generateSecondaryActions } from "@/lib/secondary-action-generator/generate-secondary-actions";
import type { EventContextInput } from "@/lib/secondary-action-generator/types";
import type {
  PredictiveDockAction,
  PredictiveDockWire,
} from "@/lib/predictive-dock/types";

/** Apply MAIN/AUX split + lifecycle secondary generator to dock actions. */
export function applyMainAuxToDockWire(input: {
  actions: readonly PredictiveDockAction[];
  minutes_until_event?: number | null;
  event?: EventContextInput;
  user_history?: {
    preferred_plugins?: readonly string[];
    dismissed_labels?: readonly string[];
  };
  ranking_context_key?: string;
}): PredictiveDockWire {
  if (input.actions.length === 0) {
    return { main_action: null, shadow_actions: [] };
  }

  const split = splitMainAuxActionsWithExplain({
    candidates: input.actions.map(predictiveDockActionToCandidate),
    minutes_until_event: input.minutes_until_event,
    ranking_context_key: input.ranking_context_key,
  });

  const byId = new Map(input.actions.map((action) => [action.id, action]));

  if (!split.primary_action) {
    return {
      main_action: null,
      shadow_actions: split.secondary_actions
        .map((aux) => byId.get(aux.action_id))
        .filter((action): action is PredictiveDockAction => Boolean(action))
        .map((action) => ({
          ...action,
          action_tier: "AUX" as const,
          plugin: action.plugin ?? null,
        })),
    };
  }

  const mainSource = byId.get(split.primary_action.action_id)!;
  const main_action: PredictiveDockAction = {
    ...mainSource,
    state: "ACTIVE",
    action_tier: "MAIN",
    plugin: split.primary_action.plugin,
    rankingWhy: split.primary_why_line ?? undefined,
  };

  const generated = generateSecondaryActions({
    main_action: {
      id: split.primary_action.action_id,
      label: split.primary_action.label,
      action_type: mainSource.type,
      plugin: split.primary_action.plugin,
    },
    event: input.event ?? {
      title: mainSource.label,
      minutes_until_event: input.minutes_until_event ?? null,
    },
    user_history: input.user_history,
    candidate_pool: input.actions
      .filter((action) => action.id !== split.primary_action!.action_id)
      .map((action) => ({
        id: action.id,
        label: action.label,
        action_type: action.type,
      })),
  });

  const shadow_actions: PredictiveDockAction[] = generated.map((aux) => {
    const existing = byId.get(aux.id);
    return {
      ...(existing ?? {
        id: aux.id,
        type: mainSource.type,
        label: aux.label,
        icon: mainSource.icon,
        score: aux.confidence * 100,
        state: "WARM" as const,
        prompt: aux.label,
      }),
      state: "WARM",
      action_tier: "AUX",
      plugin: aux.plugin,
      secondary_reason: aux.reason,
    };
  });

  return { main_action, shadow_actions };
}

export function flattenDockWire(wire: PredictiveDockWire): PredictiveDockAction[] {
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
