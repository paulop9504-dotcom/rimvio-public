#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { buildGoalSnapshot } from "../lib/goal-engine/build-goal-snapshot";
import { deriveGoalPriorityHint } from "../lib/goal-engine/derive-priority-hint";
import { scoreActionAlignment } from "../lib/goal-engine/score-action-alignment";
import {
  publishGoalSnapshotFromTurn,
  readLastGoalSnapshot,
  readLastGoalSnapshotRevision,
  resetGoalSnapshotSessionForTests,
} from "../lib/goal-engine/goal-snapshot-session";
import { serializeGoalSnapshotWire } from "../lib/goal-engine/serialize-goal-snapshot-wire";
import { stampGoalEngineMetadata } from "../lib/goal-engine/stamp-goal-metadata";
import { validateGoalSnapshot } from "../lib/goal-engine/validate-goal-snapshot";
import {
  applyTierGoalPolicy,
  inferTierActionKind,
} from "../lib/goal-engine/apply-tier-goal-policy";
import { combineDockGoalScores, rankPredictiveDockByGoal } from "../lib/goal-engine/rank-dock-by-goal";
import {
  applyMealGoalPolicyToRecommendation,
  formatMealGoalNudge,
} from "../lib/goal-engine/apply-meal-goal-policy";
import { recommendFromContext } from "../lib/event-os/contextual-recommendation/recommend-from-context";
import { mapDockActionToGoalAlignable } from "../lib/goal-engine/map-dock-action-to-goal";
import type { PredictiveDockAction } from "../lib/predictive-dock/types";
import type { OrchestratorResult } from "../lib/action-chat/orchestrator-types";

const revenueSnapshot = buildGoalSnapshot({
  referenceDate: "2026-06-04",
  existingSchedule: [{ time: "09:00", task: "클라이언트 미팅" }],
  userGoals: [
    {
      id: "g1",
      kind: "revenue",
      label: "월 수익",
      targetValue: 5_000_000,
      unit: "원",
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01",
    },
  ],
  reminders: [],
});

assert.equal(revenueSnapshot.primaryFocus, "revenue");
assert.ok(revenueSnapshot.sourceRevision.startsWith("goal_"));
assert.equal(validateGoalSnapshot(revenueSnapshot).length, 0);

const scheduleAlign = scoreActionAlignment(
  { kind: "schedule", label: "일정 정리" },
  revenueSnapshot,
);
assert.equal(scheduleAlign.score, 0.9);
assert.ok(scheduleAlign.reasons.includes("matches_primary_focus"));

const mealAlign = scoreActionAlignment(
  { kind: "meal", label: "맛집 추천" },
  revenueSnapshot,
);
assert.equal(mealAlign.score, 0.3);
assert.ok(scheduleAlign.score > mealAlign.score);

const certSnapshot = buildGoalSnapshot({
  referenceDate: "2026-06-04",
  existingSchedule: [],
  userGoals: [
    {
      id: "g2",
      kind: "certification",
      label: "정보처리기사",
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01",
    },
  ],
  reminders: [],
});

const studyAlign = scoreActionAlignment(
  { kind: "study", label: "공부 블록" },
  certSnapshot,
);
assert.equal(studyAlign.score, 0.95);
assert.ok(studyAlign.reasons.includes("matches_primary_focus"));

const noneSnapshot = buildGoalSnapshot({
  referenceDate: "2026-06-04",
  existingSchedule: [],
  userGoals: [],
  reminders: [],
});

const neutralMeal = scoreActionAlignment(
  { kind: "meal", label: "저녁" },
  noneSnapshot,
);
assert.equal(neutralMeal.score, 0.5);
assert.ok(neutralMeal.reasons.includes("neutral_focus"));

const horizonSnapshot: typeof revenueSnapshot = {
  ...revenueSnapshot,
  eventHorizonSummary: { severity: "high", summary: "자격증 시험 5일 남음" },
};
const horizonSchedule = scoreActionAlignment(
  { kind: "schedule", label: "일정" },
  horizonSnapshot,
);
assert.equal(horizonSchedule.score, 1);
assert.ok(horizonSchedule.reasons.includes("deadline_soon"));

const deterministicA = scoreActionAlignment(
  { kind: "meal", label: "맛집" },
  revenueSnapshot,
);
const deterministicB = scoreActionAlignment(
  { kind: "meal", label: "맛집" },
  revenueSnapshot,
);
assert.deepEqual(deterministicA, deterministicB);

const revenueHint = deriveGoalPriorityHint({
  ...revenueSnapshot,
  constraints: undefined,
  eventHorizonSummary: undefined,
});
assert.deepEqual(revenueHint.preferKinds, ["schedule", "navigate"]);
assert.deepEqual(revenueHint.suppressKinds, ["meal", "place"]);
assert.equal(revenueHint.nudgeMessage, "이번 주는 중요한 업무 일정이 우선이에요.");

const certHint = deriveGoalPriorityHint({
  ...certSnapshot,
  constraints: undefined,
  eventHorizonSummary: undefined,
});
assert.deepEqual(certHint.preferKinds, ["study", "schedule"]);
assert.deepEqual(certHint.suppressKinds, ["place"]);
assert.equal(certHint.nudgeMessage, "시험 준비에 집중하기 좋은 시기예요.");

const noneHint = deriveGoalPriorityHint({
  ...noneSnapshot,
  constraints: undefined,
  eventHorizonSummary: undefined,
});
assert.deepEqual(noneHint, {});
assert.equal(noneHint.nudgeMessage, undefined);

const horizonHint = deriveGoalPriorityHint({
  ...horizonSnapshot,
  constraints: undefined,
});
assert.deepEqual(horizonHint.preferKinds, ["schedule", "navigate"]);
assert.equal(horizonHint.nudgeMessage, "중요한 일정이 가까워지고 있어요.");

const certHorizon = deriveGoalPriorityHint({
  ...certSnapshot,
  constraints: undefined,
  eventHorizonSummary: { severity: "high", summary: "시험 5일 전" },
});
assert.deepEqual(certHorizon.preferKinds, ["study", "schedule"]);
assert.equal(certHorizon.nudgeMessage, "중요한 일정이 가까워지고 있어요.");

const constraintHint = deriveGoalPriorityHint({
  ...revenueSnapshot,
  constraints: [
    { kind: "avoidLateNight" },
    { kind: "avoidTravel" },
    { kind: "needLunchWindow" },
  ],
});
assert.ok(constraintHint.suppressKinds?.includes("late_night_activity"));
assert.ok(constraintHint.suppressKinds?.includes("navigate"));
assert.ok(constraintHint.preferKinds?.includes("meal"));

const hintAgain = deriveGoalPriorityHint({
  ...revenueSnapshot,
  constraints: undefined,
  eventHorizonSummary: undefined,
});
assert.deepEqual(revenueHint, hintAgain);

resetGoalSnapshotSessionForTests();
publishGoalSnapshotFromTurn("scope-a", revenueSnapshot);
assert.equal(readLastGoalSnapshot("scope-a")?.sourceRevision, revenueSnapshot.sourceRevision);
assert.equal(
  readLastGoalSnapshotRevision("scope-a"),
  revenueSnapshot.sourceRevision,
);

const wire = serializeGoalSnapshotWire(certSnapshot);
assert.equal(wire.read_only, true);
assert.equal(wire.primaryFocus, "certification");
assert.equal(JSON.stringify(wire).includes("editable"), false);

const stamped = stampGoalEngineMetadata(
  { summary: "ok", actions: [], source: "rules" },
  certSnapshot,
);
assert.equal(stamped.metadata?.goal_snapshot_revision, certSnapshot.sourceRevision);
assert.equal(stamped.goalSnapshot?.read_only, true);

assert.equal(inferTierActionKind("PlaceRecommendation", "배고파"), "meal");
assert.equal(inferTierActionKind("PlaceRecommendation", "근처 카페"), "place");
assert.equal(inferTierActionKind("ScheduleIntelligence", "내일 일정"), "schedule");

const placeBase: OrchestratorResult = {
  summary: "주변 맛집을 골라봤어요.",
  actions: [{ label: "지도", href: "https://example.com", icon: "map" }],
  source: "rules",
  confidence: 0.93,
};

const certPlaceAdjusted = applyTierGoalPolicy(placeBase, {
  goalSnapshot: certSnapshot,
  goalPriorityHint: certHint,
  tierDetail: "PlaceRecommendation",
  userMessage: "배고파",
});
assert.ok(certPlaceAdjusted.actions.length > 0);
assert.ok((certPlaceAdjusted.confidence ?? 1) < (placeBase.confidence ?? 1));
assert.ok(certPlaceAdjusted.summary.includes("근처 식사 가능한 곳은 여기예요."));
assert.ok(
  certPlaceAdjusted.summary.includes(
    "시험 준비가 우선순위로 잡혀 있으니 빠르게 식사할 수 있는 곳 위주로 추천드릴게요.",
  ),
);

const scheduleBase: OrchestratorResult = {
  summary: "일정을 정리했어요.",
  actions: [{ label: "캘린더", href: "rimvio://calendar", icon: "calendar" }],
  source: "rules",
  confidence: 0.75,
};

const horizonScheduleAdjusted = applyTierGoalPolicy(scheduleBase, {
  goalSnapshot: horizonSnapshot,
  goalPriorityHint: horizonHint,
  tierDetail: "ScheduleIntelligence",
  userMessage: "내일 일정",
});
assert.ok((horizonScheduleAdjusted.confidence ?? 0) > (scheduleBase.confidence ?? 0));
assert.ok(horizonScheduleAdjusted.summary.includes(horizonHint.nudgeMessage ?? ""));

assert.equal(mapDockActionToGoalAlignable(dockStub("공부 시작", "REST")).kind, "study");
assert.equal(mapDockActionToGoalAlignable(dockStub("맛집 찾기", "INFO")).kind, "meal");
assert.equal(mapDockActionToGoalAlignable(dockStub("시험 일정 보기", "LIST")).kind, "schedule");

const blendedHigh = combineDockGoalScores(90, 0.95);
const blendedLow = combineDockGoalScores(90, 0.2);
assert.ok(blendedHigh > blendedLow);

const certDock = rankPredictiveDockByGoal(
  {
    main_action: dockStub("맛집 찾기", "INFO", 50),
    shadow_actions: [
      dockStub("시험 일정 보기", "LIST", 50),
      dockStub("공부 시작", "REST", 50),
    ],
  },
  certSnapshot,
);
assert.equal(certDock.main_action?.label, "공부 시작");
assert.equal(certDock.main_action?.goalAligned, true);
assert.ok(typeof certDock.main_action?.goal_alignment_score === "number");
assert.equal(certDock.shadow_actions.length, 2);
assert.deepEqual(
  certDock.shadow_actions.map((item) => item.label),
  ["시험 일정 보기", "맛집 찾기"],
);

const hungryRec = recommendFromContext({ message: "배고파", topN: 3 });
const certMealRec = applyMealGoalPolicyToRecommendation(
  hungryRec,
  certSnapshot,
  certHint,
);
assert.equal(certMealRec.rankedCandidates.length, hungryRec.rankedCandidates.length);
const certTop = certMealRec.rankedCandidates[0]?.item ?? "";
assert.ok(certTop === "연어 포케볼" || certTop === "샐러드 치킨볼");
const heavyIndex = certMealRec.rankedCandidates.findIndex(
  (row) => row.item === "제육볶음",
);
const lightIndex = certMealRec.rankedCandidates.findIndex(
  (row) => row.item === "연어 포케볼",
);
if (heavyIndex >= 0 && lightIndex >= 0) {
  assert.ok(lightIndex < heavyIndex);
}
const certNudge = formatMealGoalNudge(certSnapshot, certHint);
assert.ok(certNudge?.includes("식사는 추천드릴게요"));
assert.ok(certNudge?.includes("시험 준비"));

function dockStub(
  label: string,
  type: PredictiveDockAction["type"],
  score = 50,
): PredictiveDockAction {
  return {
    id: `dock-${label}`,
    type,
    label,
    icon: "•",
    score,
    state: "WARM",
    prompt: label,
  };
}

console.log("test-goal-engine: ok");
