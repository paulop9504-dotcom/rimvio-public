import type { GoalAlignableAction, GoalAlignableActionKind } from "@/lib/goal-engine/types";
import type { PredictiveDockAction, PredictiveActionType } from "@/lib/predictive-dock/types";

const STUDY_LABEL =
  /(?:공부\s*시작|공부|학습|복습|시험\s*준비|집중\s*모드|study)/iu;
const MEAL_LABEL =
  /(?:맛집\s*찾|맛집|식사|밥|먹|저녁|점심|배고|한끼|레스토랑|식당|치킨|카페)/iu;
const PLACE_LABEL =
  /(?:장소\s*추천|장소\s*찾|근처\s*장소|place\s*recommend)/iu;
const SCHEDULE_LABEL =
  /(?:일정|캘린더|스케줄|시험\s*일정|미팅|약속|리마인더|calendar|schedule)/iu;
const NAVIGATE_LABEL =
  /(?:길찾|네비|이동|교통|택시|대중교통|navigate|transit)/iu;

function kindFromLabel(label: string): GoalAlignableActionKind | null {
  if (STUDY_LABEL.test(label)) {
    return "study";
  }
  if (MEAL_LABEL.test(label)) {
    return "meal";
  }
  if (PLACE_LABEL.test(label)) {
    return "place";
  }
  if (SCHEDULE_LABEL.test(label)) {
    return "schedule";
  }
  if (NAVIGATE_LABEL.test(label)) {
    return "navigate";
  }
  return null;
}

function kindFromDockType(type: PredictiveActionType): GoalAlignableActionKind | null {
  switch (type) {
    case "NAVIGATE":
    case "TRANSIT":
    case "TAXI":
      return "navigate";
    case "LIST":
    case "CHECK":
    case "SAVE":
    case "NEXT":
      return "schedule";
    default:
      return null;
  }
}

/** Map predictive dock row → GoalAlignableAction (Hook C — no focus-specific branches). */
export function mapDockActionToGoalAlignable(
  action: PredictiveDockAction,
): GoalAlignableAction {
  const label = action.label.trim();
  const fromLabel = kindFromLabel(label);
  const fromType = kindFromDockType(action.type);
  const kind = fromLabel ?? fromType ?? "generic";

  return {
    kind,
    label,
    semanticReason: action.rankingWhy,
    confidence: Number.isFinite(action.score) ? action.score / 100 : undefined,
  };
}
