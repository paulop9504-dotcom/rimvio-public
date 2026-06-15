import { rankPredictiveDockByGoal } from "@/lib/goal-engine/rank-dock-by-goal";
import type { GoalSnapshot } from "@/lib/goal-engine/types";
import type { CapabilityId } from "@/lib/capability-registry/capability-types";
import type { RankedSurface, SurfaceAction } from "@/lib/surface-engine/surface-contract";
import { isFallbackSurface } from "@/lib/surface-engine/surface-ux-state";
import type {
  PredictiveActionType,
  PredictiveDockAction,
  PredictiveDockWire,
} from "@/lib/predictive-dock/types";

const CAPABILITY_DOCK: Partial<
  Record<CapabilityId, { type: PredictiveActionType; icon: string }>
> = {
  NAVIGATE: { type: "NAVIGATE", icon: "🧭" },
  CALL: { type: "CALL", icon: "📞" },
  BOOK_FLIGHT: { type: "TICKET_QR", icon: "✈️" },
  BOOK_HOTEL: { type: "CHECK", icon: "🏨" },
  CHECK_IN: { type: "CHECK", icon: "📱" },
  CALENDAR: { type: "CHECK", icon: "📅" },
  ALARM: { type: "CHECK", icon: "⏰" },
  CONFIRM_PLACE: { type: "NAVIGATE", icon: "📍" },
  CLARIFY_GOAL: { type: "NEXT", icon: "🎯" },
  OPEN_EVENT: { type: "NEXT", icon: "▶️" },
  DISMISS_SURFACE: { type: "REST", icon: "💤" },
  TAXI: { type: "TAXI", icon: "🚕" },
  MESSAGE: { type: "SHARE", icon: "💬" },
};

function surfaceActionToDock(
  action: SurfaceAction,
  surface: RankedSurface,
  tier: "MAIN" | "AUX",
): PredictiveDockAction {
  const mapped = CAPABILITY_DOCK[action.capabilityId] ?? { type: "NEXT" as const, icon: "▶️" };
  return {
    id: action.id,
    type: mapped.type,
    label: action.label,
    icon: mapped.icon,
    score: surface.priority.surfacePriorityScore,
    state: "ACTIVE",
    prompt: `@capability ${action.capabilityId} ${surface.title}`.trim(),
    anchorId: action.eventId,
    action_tier: tier,
    rankingWhy: surface.narration?.summary,
  };
}

/** Map FEED-channel surfaces → dock wire (capability ids only — no providers). */
export function surfacesToPredictiveDockWire(
  surfaces: readonly RankedSurface[],
): PredictiveDockWire {
  const visible = surfaces.filter(
    (surface) =>
      !isFallbackSurface(surface) &&
      (surface.visibility === "prominent" || surface.visibility === "normal"),
  );
  if (visible.length === 0) {
    return { main_action: null, shadow_actions: [] };
  }

  const [head, ...rest] = visible;
  const main = surfaceActionToDock(head.primaryAction, head, "MAIN");
  const shadows: PredictiveDockAction[] = [];

  for (const secondary of head.secondaryActions.slice(0, 2)) {
    shadows.push(surfaceActionToDock(secondary, head, "AUX"));
  }
  for (const surface of rest.slice(0, 4)) {
    shadows.push(surfaceActionToDock(surface.primaryAction, surface, "AUX"));
  }

  return { main_action: main, shadow_actions: shadows };
}

export function applyGoalBlendToDockWire(
  wire: PredictiveDockWire,
  goalSnapshot: GoalSnapshot | null,
): PredictiveDockWire {
  if (!goalSnapshot || goalSnapshot.primaryFocus === "none") {
    return wire;
  }
  return rankPredictiveDockByGoal(wire, goalSnapshot);
}
