/**
 * GOAL Engine — constitution types (§2.1).
 * GoalSnapshot is a read-only aggregated view, not source of truth.
 *
 * Invariants:
 * - primaryFocus is always defined (use "none" when empty)
 * - activeGoals.length <= 3
 * - productivityScore undefined OR in [0, 100]
 */

export type GoalFocusKind =
  | "revenue"
  | "certification"
  | "wellbeing"
  | "custom"
  | "none";

/** Opaque constraint token — GOAL Engine stores/forwards only; no interpretation here. */
export interface GoalConstraint {
  kind: string;
  value?: string | number | boolean;
}

/** Minimal goal projection — not a copy of goal-roadmap wire. */
export interface GoalSummary {
  id: string;
  label: string;
  kind: GoalFocusKind;
  deadline?: string;
  /** 0–100 when known from goal-roadmap */
  progress?: number;
}

/** Single highest-priority horizon line — not full event_horizon array. */
export interface EventHorizonSummary {
  severity: "low" | "medium" | "high";
  summary: string;
}

export interface GoalSnapshot {
  referenceDate: string;
  activeGoals: GoalSummary[];
  primaryFocus: GoalFocusKind;
  weekFocusLabel?: string;
  eventHorizonSummary?: EventHorizonSummary;
  vitalityHint?: string;
  productivityScore?: number;
  constraints?: GoalConstraint[];
  sourceRevision: string;
  snapshotExpiresAt?: string;
}

/** Allowed alignment reason codes (§3 — no arbitrary strings). */
export type AlignmentReasonCode =
  | "matches_primary_focus"
  | "deadline_soon"
  | "constraint_penalty"
  | "high_confidence"
  | "neutral_focus";

export interface AlignmentScore {
  score: number;
  reasons: AlignmentReasonCode[];
}

export type GoalAlignableActionKind =
  | "schedule"
  | "study"
  | "meal"
  | "place"
  | "navigate"
  | "generic";

export interface GoalAlignableAction {
  kind: GoalAlignableActionKind;
  label: string;
  confidence?: number;
  semanticReason?: string;
}

export interface GoalPriorityHint {
  preferKinds?: string[];
  suppressKinds?: string[];
  nudgeMessage?: string;
}

export type GoalSnapshotBuildInput = {
  referenceDate: string;
  existingSchedule: import("@/lib/schedule/day-schedule").DayScheduleTask[];
  userGoals?: import("@/lib/goal-roadmap/types").UserGoalWire[];
  activitySources?: import("@/lib/schedule-intelligence/types").ScheduleActivityWire[];
  userStatus?: import("@/lib/global-brain/types").UserStatusWire | null;
  recentUserStatus?: Array<{
    flag: import("@/lib/global-brain/types").UserStatusFlag;
    label: string;
    vitality: import("@/lib/vitality/types").VitalityTag;
    updatedAt: string;
  }>;
  reminders?: Array<{ id: string; title: string; fireAt: string; url?: string }>;
  now?: Date;
};

export interface GoalTurnContext {
  userMessage?: string;
}

export type GoalEngineWireFields = {
  goal_primary_focus?: GoalFocusKind;
  goal_snapshot_revision?: string;
};
