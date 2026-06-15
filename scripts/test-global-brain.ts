import assert from "node:assert/strict";
import { buildGlobalBrainSnapshot, detectEventHorizon } from "../lib/global-brain/detect-event-horizon";
import { buildGlobalBrainContextBlock } from "../lib/global-brain/build-context-injection-block";
import { buildGoalSnapshot } from "../lib/goal-engine/build-goal-snapshot";
import { mapVitalityMatchToUserStatus } from "../lib/global-brain/map-vitality-to-status";
import { upsertUserStatus, readUserStatus, resetUserStatusForTests } from "../lib/global-brain/user-status-store";
import { resolveVitalityStateFromKind } from "../lib/vitality-state/vitality-state-registry";

resetUserStatusForTests();

const tiredStatus = upsertUserStatus({
  flag: "tired",
  label: "에너지 고갈",
  vitality: "Haven",
  sourceMessage: "피곤해",
});

const snapshot = buildGlobalBrainSnapshot({
  referenceDate: "2026-05-29",
  existingSchedule: [
    { time: "09:00", task: "팀 미팅" },
    { time: "11:00", task: "프로젝트 작업" },
    { time: "14:00", task: "클라이언트 회의" },
    { time: "16:00", task: "리포트 작성" },
  ],
  userStatus: tiredStatus,
  now: new Date("2026-05-29T08:30:00"),
});

assert.ok(snapshot.eventHorizon.length >= 1);
assert.ok(snapshot.eventHorizon.some((item) => item.kind === "tired_heavy_schedule"));

const block = buildGlobalBrainContextBlock({ snapshot, shouldEnrich: true });
assert.ok(block.includes("GLOBAL_BRAIN_SNAPSHOT"));
assert.ok(!block.includes('"goal_snapshot"'));

const certGoalSnapshot = buildGoalSnapshot({
  referenceDate: "2026-05-29",
  existingSchedule: [],
  userGoals: [
    {
      id: "g-cert",
      kind: "certification",
      label: "정보처리기사",
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01",
    },
  ],
  reminders: [],
});
const blockWithGoal = buildGlobalBrainContextBlock({
  snapshot,
  shouldEnrich: true,
  goalSnapshot: certGoalSnapshot,
});
assert.ok(blockWithGoal.includes('"goal_snapshot"'));
assert.ok(blockWithGoal.includes('"primaryFocus": "certification"'));
assert.ok(blockWithGoal.includes('"read_only": true'));
assert.ok(block.includes("[CURRENT SNAPSHOT]"));
assert.ok(block.includes("Global Brain") || block.includes("GLOBAL_BRAIN"));

const hungerMatch = resolveVitalityStateFromKind("hunger", 0.9);
assert.ok(hungerMatch);
const status = mapVitalityMatchToUserStatus(hungerMatch!, "배고파");
assert.equal(status.flag, "hungry");
assert.equal(readUserStatus()?.flag, "tired");

const lunchInsight = detectEventHorizon(
  buildGlobalBrainSnapshot({
    referenceDate: "2026-05-29",
    existingSchedule: [{ time: "15:00", task: "회의" }],
    userStatus: null,
    now: new Date("2026-05-29T12:30:00"),
  })
);
assert.ok(lunchInsight.some((item) => item.kind === "no_lunch_window"));

console.log("test-global-brain: ok");
