export { buildGoalSnapshot } from "@/lib/goal-engine/build-goal-snapshot";
export { scoreActionAlignment } from "@/lib/goal-engine/score-action-alignment";
export { deriveGoalPriorityHint } from "@/lib/goal-engine/derive-priority-hint";

export type {
  AlignmentReasonCode,
  AlignmentScore,
  EventHorizonSummary,
  GoalAlignableAction,
  GoalAlignableActionKind,
  GoalConstraint,
  GoalFocusKind,
  GoalPriorityHint,
  GoalSnapshot,
  GoalSnapshotBuildInput,
  GoalSummary,
  GoalTurnContext,
} from "@/lib/goal-engine/types";
