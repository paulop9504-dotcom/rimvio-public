/**
 * GOAL Engine aggregation (§5) — read-only output `GoalSnapshot`.
 * Reads: goal-roadmap (`scoreDailyProductivity`), event-horizon (`buildLifeContextSnapshot`).
 * Must not write goal-roadmap, global-brain, or schedule-intelligence state.
 */
import { createHash } from "node:crypto";
import { buildLifeContextSnapshot } from "@/lib/event-horizon/build-life-context-snapshot";
import type { EventHorizonInsight } from "@/lib/global-brain/types";
import { scoreDailyProductivity } from "@/lib/goal-roadmap/orchestrate-goal-alignment";
import type {
  GoalConstraint,
  GoalFocusKind,
  GoalSnapshot,
  GoalSnapshotBuildInput,
  GoalSummary,
  EventHorizonSummary,
} from "@/lib/goal-engine/types";
import { assertValidGoalSnapshot } from "@/lib/goal-engine/validate-goal-snapshot";
import type { UserGoalWire } from "@/lib/goal-roadmap/types";
import type { VitalityTag } from "@/lib/vitality/types";

const MEAL_STATUS = /(?:배고|hungry|맛집|먹)/iu;

function mapGoalKind(kind: UserGoalWire["kind"]): GoalFocusKind {
  if (kind === "revenue" || kind === "certification" || kind === "custom") {
    return kind;
  }
  return "custom";
}

function toGoalSummaries(goals: UserGoalWire[]): GoalSummary[] {
  return goals.slice(0, 3).map((goal) => ({
    id: goal.id,
    label: goal.label,
    kind: mapGoalKind(goal.kind),
    deadline: goal.deadline,
    progress: undefined,
  }));
}

function resolvePrimaryFocus(summaries: GoalSummary[]): GoalFocusKind {
  if (!summaries.length) {
    return "none";
  }

  const now = Date.now();
  const ranked = [...summaries].sort((left, right) => {
    const leftDeadline = left.deadline ? Date.parse(left.deadline) : Number.POSITIVE_INFINITY;
    const rightDeadline = right.deadline ? Date.parse(right.deadline) : Number.POSITIVE_INFINITY;
    const leftDelta = leftDeadline - now;
    const rightDelta = rightDeadline - now;
    if (leftDelta !== rightDelta) {
      return leftDelta - rightDelta;
    }
    const kindRank = (kind: GoalFocusKind) =>
      kind === "revenue" ? 0 : kind === "certification" ? 1 : 2;
    return kindRank(left.kind) - kindRank(right.kind);
  });

  return ranked[0]!.kind === "custom" ? "custom" : ranked[0]!.kind;
}

function buildWeekFocusLabel(focus: GoalFocusKind, summaries: GoalSummary[]): string | undefined {
  if (focus === "none") {
    return undefined;
  }
  const primary = summaries[0];
  if (!primary) {
    return undefined;
  }
  if (focus === "revenue") {
    return `매출 확보 · ${primary.label}`;
  }
  if (focus === "certification") {
    return `이번 주 자격증 집중 · ${primary.label}`;
  }
  if (focus === "wellbeing") {
    return `회복 · ${primary.label}`;
  }
  return `이번 주 · ${primary.label}`;
}

function pickEventHorizonSummary(
  insights: EventHorizonInsight[],
): EventHorizonSummary | undefined {
  if (!insights.length) {
    return undefined;
  }

  const ranked = [...insights].sort((left, right) => {
    const weight = (severity: EventHorizonInsight["severity"]) =>
      severity === "high" ? 2 : 1;
    return weight(right.severity) - weight(left.severity);
  });

  const top = ranked[0]!;
  const summary = top.suggestion?.trim() || top.headline?.trim();
  if (!summary) {
    return undefined;
  }

  return {
    severity: top.severity === "high" ? "high" : "medium",
    summary,
  };
}

function vitalityToHint(tag: VitalityTag | null | undefined): string | undefined {
  if (!tag) {
    return undefined;
  }
  if (tag === "Apex" || tag === "Haven" || tag === "Nexus" || tag === "Sentinel") {
    return tag;
  }
  return String(tag);
}

function buildConstraintsFromHorizon(insights: EventHorizonInsight[]): GoalConstraint[] {
  const constraints: GoalConstraint[] = [];
  if (insights.some((item) => item.kind === "late_work_early_meeting")) {
    constraints.push({ kind: "avoidLateNight" });
  }
  if (insights.some((item) => item.kind === "no_lunch_window")) {
    constraints.push({ kind: "needLunchWindow" });
  }
  if (
    insights.some(
      (item) => item.kind === "tired_heavy_schedule" || item.kind === "stressed_dense_day",
    )
  ) {
    constraints.push({ kind: "reduceApexLoad" });
  }
  return constraints;
}

function buildSourceRevision(parts: string[]): string {
  const digest = createHash("sha256").update(parts.join("|"), "utf8").digest("hex");
  return `goal_${digest.slice(0, 6)}`;
}

function buildSnapshotExpiresAt(referenceDate: string): string {
  const base = new Date(`${referenceDate}T12:00:00`);
  base.setDate(base.getDate() + 7);
  return base.toISOString();
}

function mapReminders(
  reminders: GoalSnapshotBuildInput["reminders"],
): import("@/lib/schedule-intelligence/types").ScheduleReminderWire[] {
  return (reminders ?? []).map((item) => ({
    id: item.id,
    title: item.title,
    fireAt: item.fireAt,
    url: item.url ?? null,
  }));
}

/** Single entry point — pure read/projection from existing modules. */
export function buildGoalSnapshot(input: GoalSnapshotBuildInput): GoalSnapshot {
  const wireGoals = input.userGoals ?? [];
  const activeGoals = toGoalSummaries(wireGoals);
  const primaryFocus = resolvePrimaryFocus(activeGoals);

  const brain = buildLifeContextSnapshot({
    referenceDate: input.referenceDate,
    existingSchedule: input.existingSchedule,
    userGoals: wireGoals.slice(0, 3),
    userStatus: input.userStatus ?? null,
    recentStateMessages: (input.recentUserStatus ?? []).map((row) => ({
      flag: row.flag,
      label: row.label,
      updatedAt: row.updatedAt,
    })),
    activitySources: input.activitySources,
    now: input.now,
  });

  const eventHorizonSummary = pickEventHorizonSummary(brain.eventHorizon);
  const vitalityHint = vitalityToHint(
    input.userStatus?.vitality ?? input.recentUserStatus?.[0]?.vitality,
  );

  let productivityScore: number | undefined;
  if (wireGoals.length > 0) {
    const productivity = scoreDailyProductivity({
      context: {
        referenceDate: input.referenceDate,
        reminders: mapReminders(input.reminders),
        goals: wireGoals.slice(0, 3),
        activitySources: input.activitySources,
      },
    });
    if (typeof productivity.score === "number") {
      productivityScore = Math.max(0, Math.min(100, Math.round(productivity.score)));
    }
  }

  const constraints = buildConstraintsFromHorizon(brain.eventHorizon);

  const wellbeing =
    input.userStatus?.flag === "tired" ||
    input.userStatus?.flag === "anxious" ||
    input.userStatus?.flag === "stressed" ||
    MEAL_STATUS.test(input.userStatus?.label ?? "");

  const resolvedFocus: GoalFocusKind =
    wellbeing && primaryFocus === "revenue" ? "wellbeing" : primaryFocus;

  const snapshot: GoalSnapshot = {
    referenceDate: input.referenceDate,
    activeGoals,
    primaryFocus: resolvedFocus,
    weekFocusLabel: buildWeekFocusLabel(resolvedFocus, activeGoals),
    eventHorizonSummary,
    vitalityHint,
    productivityScore,
    constraints: constraints.length > 0 ? constraints : undefined,
    sourceRevision: buildSourceRevision([
      input.referenceDate,
      resolvedFocus,
      ...activeGoals.map((goal) => `${goal.id}:${goal.kind}:${goal.deadline ?? ""}`),
      eventHorizonSummary?.summary ?? "",
      eventHorizonSummary?.severity ?? "",
      String(productivityScore ?? ""),
      ...constraints.map((item) => item.kind),
    ]),
    snapshotExpiresAt: buildSnapshotExpiresAt(input.referenceDate),
  };

  assertValidGoalSnapshot(snapshot);
  return snapshot;
}
