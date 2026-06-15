#!/usr/bin/env npx tsx
/** Pure-module smoke tests (no pipeline) — always gate-safe. */
import assert from "node:assert/strict";
import { classifyAbstractionLevel } from "../lib/testing/unified-stress/abstraction-layer";
import { generateAdversarialTests } from "../lib/testing/unified-stress/adversarial-tests";
import { expandIntent } from "../lib/testing/unified-stress/expand-intent";
import { resolveSchedulingConflict } from "../lib/testing/unified-stress/scheduling-conflict-resolver";
import { generateSemanticVariations } from "../lib/testing/unified-stress/semantic-generator";

assert.equal(classifyAbstractionLevel("뭐하지").level, "L1");
assert.equal(classifyAbstractionLevel("너무 힘들어").level, "L0");
assert.equal(classifyAbstractionLevel("수능 공부 루틴 장기 전략").level, "L4");

const expansion = expandIntent("배고픈데 일정도 있고 돈도 없어");
assert.ok(expansion.domainMapping.includes("food"));
assert.ok(expansion.domainMapping.includes("schedule"));
assert.ok(expansion.domainMapping.includes("money"));
assert.equal(expansion.actionType, "planning");

assert.equal(generateSemanticVariations("오늘 뭐 먹지?").length, 10);
assert.equal(generateAdversarialTests("오늘 뭐 먹지?").length, 10);

const scheduling = resolveSchedulingConflict({
  expansion: expandIntent("오늘 저녁 운동"),
  existingSchedule: [{ time: "18:00", task: "팀 회의" }],
  proposedSchedule: [{ time: "18:00", task: "헬스 운동" }],
});
assert.ok(scheduling.conflictDetected);
assert.ok(scheduling.conflictKinds.includes("HARD"));

console.log("test-unified-stress-modules: ok");
