import type { CalendarOverlayAction } from "@/lib/calendar/calendar-view-types";
import type { ActionDecisionCandidate } from "@/lib/action-decision/types";
import { splitMainAuxActionsWithExplain } from "@/lib/action-decision/split-main-aux-actions";
import { resolvePluginDeeplink } from "@/lib/action-spawn/resolve-plugin-deeplink";
import { shouldHideAuxForPhase } from "@/lib/action-spawn/resolve-lifecycle-phase";
import { generateSecondaryActions } from "@/lib/secondary-action-generator/generate-secondary-actions";
import type { EventContextInput } from "@/lib/secondary-action-generator/types";

function inferActionTypeFromLabel(label: string): string | undefined {
  if (/(?:카카오\s*T|택시)/u.test(label)) {
    return "TAXI";
  }
  if (/길찾기|내비/u.test(label)) {
    return "NAVIGATE";
  }
  if (/전화/u.test(label)) {
    return "CALL";
  }
  if (/주차/u.test(label)) {
    return "PARKING";
  }
  if (/(?:티켓|체크인|확인|준비)/u.test(label)) {
    return "CHECK";
  }
  return undefined;
}

export function overlayActionToCandidate(
  action: CalendarOverlayAction,
): ActionDecisionCandidate {
  return {
    id: action.id,
    label: action.label,
    action_type: inferActionTypeFromLabel(action.label),
  };
}

/** Rank MAIN + generate lifecycle AUX (1–3) for prep surface spawn. */
export function applyMainAuxToOverlayActions(input: {
  actions: readonly CalendarOverlayAction[];
  minutes_until_event: number | null;
  event?: EventContextInput;
  ranking_context_key?: string;
  user_history?: {
    preferred_plugins?: readonly string[];
    dismissed_labels?: readonly string[];
  };
}): CalendarOverlayAction[] {
  if (input.actions.length === 0) {
    return [];
  }

  const split = splitMainAuxActionsWithExplain({
    candidates: input.actions.map(overlayActionToCandidate),
    minutes_until_event: input.minutes_until_event,
    ranking_context_key: input.ranking_context_key,
  });

  const byId = new Map(input.actions.map((action) => [action.id, action]));
  const ordered: CalendarOverlayAction[] = [];

  const mainWire = split.primary_action;
  if (mainWire) {
    const main =
      byId.get(mainWire.action_id) ??
      ({
        id: mainWire.action_id,
        label: mainWire.label,
        source: "projection" as const,
      } satisfies CalendarOverlayAction);

    ordered.push({
      ...main,
      action_tier: "MAIN",
      plugin: mainWire.plugin,
      ranking_why: split.primary_why_line,
      deeplink: resolvePluginDeeplink(mainWire.plugin, {
        label: mainWire.label,
        destination: input.event?.location ?? null,
      }),
    });

    const generated = generateSecondaryActions({
      main_action: {
        id: mainWire.action_id,
        label: mainWire.label,
        plugin: mainWire.plugin,
      },
      event: input.event ?? {
        title: main.label,
        minutes_until_event: input.minutes_until_event,
      },
      user_history: input.user_history,
      candidate_pool: input.actions
        .filter((action) => action.id !== mainWire.action_id)
        .map((action) => ({
          id: action.id,
          label: action.label,
          action_type: inferActionTypeFromLabel(action.label),
        })),
    });

    const spawnPhase = input.event?.spawn_phase ?? "default";
    const destination = input.event?.location ?? null;

    for (const aux of generated) {
      if (shouldHideAuxForPhase(spawnPhase, aux.plugin)) {
        continue;
      }
      const existing = byId.get(aux.id);
      const plugin = aux.plugin;
      ordered.push({
        ...(existing ?? {
          id: aux.id,
          label: aux.label,
          source: "projection" as const,
        }),
        action_tier: "AUX",
        plugin,
        secondary_reason: aux.reason,
        deeplink: resolvePluginDeeplink(plugin, {
          label: aux.label,
          destination,
        }),
      });
    }

    return ordered;
  }

  for (const aux of split.secondary_actions) {
    const item = byId.get(aux.action_id);
    if (!item) {
      continue;
    }
    ordered.push({
      ...item,
      action_tier: "AUX",
      plugin: aux.plugin ?? null,
    });
  }

  return ordered;
}
