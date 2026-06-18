import { hasGoalConstraint } from "@/lib/goal-engine/goal-constraint-helpers";
import type {
  GoalFocusKind,
  GoalPriorityHint,
  GoalSnapshot,
  GoalTurnContext,
} from "@/lib/goal-engine/types";

const HORIZON_NUDGE = "중요한 일정이 가까워지고 있어요.";

const FOCUS_NUDGE: Partial<Record<GoalFocusKind, string>> = {
  revenue: "이번 주는 중요한 업무 일정이 우선이에요.",
  certification: "시험 준비에 집중하기 좋은 시기예요.",
  wellbeing: "컨디션 회복을 우선해보세요.",
};

function dedupeKinds(items: string[]): string[] {
  const seen = new Set<string>();
  const next: string[] = [];
  for (const item of items) {
    const trimmed = item.trim();
    if (!trimmed || seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    next.push(trimmed);
  }
  return next;
}

function pushKind(list: string[], kind: string): void {
  list.push(kind);
}

function applyFocusBase(
  focus: GoalFocusKind,
  prefer: string[],
  suppress: string[],
): string | undefined {
  switch (focus) {
    case "revenue":
      pushKind(prefer, "schedule");
      pushKind(prefer, "navigate");
      pushKind(suppress, "meal");
      pushKind(suppress, "place");
      return FOCUS_NUDGE.revenue;
    case "certification":
      pushKind(prefer, "study");
      pushKind(prefer, "schedule");
      pushKind(suppress, "place");
      return FOCUS_NUDGE.certification;
    case "wellbeing":
      pushKind(prefer, "meal");
      pushKind(prefer, "place");
      return FOCUS_NUDGE.wellbeing;
    case "custom":
      pushKind(prefer, "generic");
      return undefined;
    case "none":
    default:
      return undefined;
  }
}

function applyHorizonOverride(
  snapshot: GoalSnapshot,
  prefer: string[],
): string {
  if (snapshot.eventHorizonSummary?.severity !== "high") {
    return "";
  }
  pushKind(prefer, "schedule");
  return HORIZON_NUDGE;
}

function applyConstraintOverrides(snapshot: GoalSnapshot, prefer: string[], suppress: string[]): void {
  if (hasGoalConstraint(snapshot, "avoidLateNight")) {
    pushKind(suppress, "late_night_activity");
  }
  if (hasGoalConstraint(snapshot, "avoidTravel")) {
    pushKind(suppress, "navigate");
  }
  if (hasGoalConstraint(snapshot, "needLunchWindow")) {
    pushKind(prefer, "meal");
  }
}

function assembleHint(input: {
  prefer: string[];
  suppress: string[];
  nudge?: string;
}): GoalPriorityHint {
  const preferKinds = dedupeKinds(input.prefer);
  const suppressKinds = dedupeKinds(input.suppress);
  const hint: GoalPriorityHint = {};

  if (preferKinds.length > 0) {
    hint.preferKinds = preferKinds;
  }
  if (suppressKinds.length > 0) {
    hint.suppressKinds = suppressKinds;
  }
  const nudge = input.nudge?.trim();
  if (nudge) {
    hint.nudgeMessage = nudge;
  }

  return hint;
}

/**
 * Policy hint only (§3.3) — Tier Router / Dock / schedule-intel read; no execution.
 * Never throws; returns `{}` on failure.
 */
export function deriveGoalPriorityHint(
  snapshot: GoalSnapshot,
  _turnContext?: GoalTurnContext,
): GoalPriorityHint {
  try {
    if (!snapshot?.referenceDate || !snapshot.primaryFocus) {
      return {};
    }

    const prefer: string[] = [];
    const suppress: string[] = [];

    let nudge = applyFocusBase(snapshot.primaryFocus, prefer, suppress);

    const horizonNudge = applyHorizonOverride(snapshot, prefer);
    if (horizonNudge) {
      nudge = horizonNudge;
    }

    applyConstraintOverrides(snapshot, prefer, suppress);

    return assembleHint({ prefer, suppress, nudge });
  } catch {
    return {};
  }
}
