import { hasGoalConstraint } from "@/lib/goal-engine/goal-constraint-helpers";
import type {
  AlignmentReasonCode,
  AlignmentScore,
  GoalAlignableAction,
  GoalAlignableActionKind,
  GoalFocusKind,
  GoalSnapshot,
} from "@/lib/goal-engine/types";

const WORK_GENERIC =
  /(?:미팅|회의|업무|프로젝트|납품|영업|클라이언트|보고|근무|집중|코딩|작업|일정)/iu;
const NIGHT_ACTIVITY =
  /(?:야간|밤\s*늦|늦은\s*밤|night|overtime|야근|22시|23시|24시)/iu;

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function pushReason(reasons: AlignmentReasonCode[], code: AlignmentReasonCode): void {
  if (!reasons.includes(code)) {
    reasons.push(code);
  }
}

function resolveKind(action: GoalAlignableAction): GoalAlignableActionKind {
  return action.kind;
}

function isWorkRelatedGeneric(label: string, semanticReason?: string): boolean {
  const hay = `${label} ${semanticReason ?? ""}`;
  return WORK_GENERIC.test(hay);
}

function focusBaseScore(
  focus: GoalFocusKind,
  kind: GoalAlignableActionKind,
  label: string,
  semanticReason?: string,
): { score: number; reason: AlignmentReasonCode } {
  if (focus === "none") {
    return { score: 0.5, reason: "neutral_focus" };
  }

  if (focus === "custom") {
    return { score: 0.6, reason: "matches_primary_focus" };
  }

  if (focus === "revenue") {
    switch (kind) {
      case "schedule":
        return { score: 0.9, reason: "matches_primary_focus" };
      case "navigate":
        return { score: 0.8, reason: "matches_primary_focus" };
      case "generic":
        return {
          score: isWorkRelatedGeneric(label, semanticReason) ? 0.65 : 0.5,
          reason: "matches_primary_focus",
        };
      case "meal":
        return { score: 0.3, reason: "matches_primary_focus" };
      case "place":
        return { score: 0.25, reason: "matches_primary_focus" };
      case "study":
        return { score: 0.65, reason: "matches_primary_focus" };
      default:
        return { score: 0.5, reason: "matches_primary_focus" };
    }
  }

  if (focus === "certification") {
    switch (kind) {
      case "study":
        return { score: 0.95, reason: "matches_primary_focus" };
      case "schedule":
        return { score: 0.8, reason: "matches_primary_focus" };
      case "meal":
        return { score: 0.35, reason: "matches_primary_focus" };
      case "place":
        return { score: 0.2, reason: "matches_primary_focus" };
      case "navigate":
        return { score: 0.5, reason: "matches_primary_focus" };
      case "generic":
        return { score: 0.55, reason: "matches_primary_focus" };
      default:
        return { score: 0.5, reason: "matches_primary_focus" };
    }
  }

  if (focus === "wellbeing") {
    switch (kind) {
      case "meal":
        return { score: 0.8, reason: "matches_primary_focus" };
      case "place":
        return { score: 0.75, reason: "matches_primary_focus" };
      case "schedule":
        return { score: 0.6, reason: "matches_primary_focus" };
      case "navigate":
        return { score: 0.55, reason: "matches_primary_focus" };
      case "study":
        return { score: 0.55, reason: "matches_primary_focus" };
      case "generic":
        return { score: 0.55, reason: "matches_primary_focus" };
      default:
        return { score: 0.55, reason: "matches_primary_focus" };
    }
  }

  return { score: 0.5, reason: "neutral_focus" };
}

function applyHorizonModifier(
  score: number,
  kind: GoalAlignableActionKind,
  snapshot: GoalSnapshot,
  reasons: AlignmentReasonCode[],
): number {
  if (snapshot.eventHorizonSummary?.severity !== "high") {
    return score;
  }
  if (kind !== "schedule" && kind !== "study") {
    return score;
  }
  pushReason(reasons, "deadline_soon");
  return score + 0.1;
}

function applyConstraintModifiers(
  score: number,
  kind: GoalAlignableActionKind,
  action: GoalAlignableAction,
  snapshot: GoalSnapshot,
  reasons: AlignmentReasonCode[],
): number {
  let next = score;

  if (hasGoalConstraint(snapshot, "avoidLateNight")) {
    const hay = `${action.label} ${action.semanticReason ?? ""}`;
    if (NIGHT_ACTIVITY.test(hay) || kind === "meal" || kind === "place") {
      next -= 0.2;
      pushReason(reasons, "constraint_penalty");
    }
  }

  if (hasGoalConstraint(snapshot, "avoidTravel") && (kind === "place" || kind === "navigate")) {
    next -= 0.2;
    pushReason(reasons, "constraint_penalty");
  }

  return next;
}

function applyConfidenceModifier(
  score: number,
  confidence: number | undefined,
  reasons: AlignmentReasonCode[],
): number {
  if (confidence == null || !Number.isFinite(confidence)) {
    return score;
  }
  pushReason(reasons, "high_confidence");
  return score + confidence * 0.05;
}

/**
 * Deterministic alignment scoring for Predictive Dock (§3).
 * Never throws; always returns AlignmentScore.
 */
export function scoreActionAlignment(
  action: GoalAlignableAction,
  snapshot: GoalSnapshot,
): AlignmentScore {
  const reasons: AlignmentReasonCode[] = [];
  const kind = resolveKind(action);
  const base = focusBaseScore(
    snapshot.primaryFocus,
    kind,
    action.label,
    action.semanticReason,
  );

  let score = base.score;
  pushReason(reasons, base.reason);

  score = applyHorizonModifier(score, kind, snapshot, reasons);
  score = applyConstraintModifiers(score, kind, action, snapshot, reasons);
  score = applyConfidenceModifier(score, action.confidence, reasons);

  return {
    score: clamp01(score),
    reasons,
  };
}
