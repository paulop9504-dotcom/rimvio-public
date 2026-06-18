#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { parseMasterOrchestratorJson } from "../lib/action-chat/wire-to-actions";
import { normalizeMasterOrchestratorWire } from "../lib/action-chat/normalize-master-result";
import { detectScheduleConflict } from "../lib/schedule/day-schedule";
import { orchestrateByRules } from "../lib/action-chat/rule-orchestrator";

const parsed = parseMasterOrchestratorJson(
  JSON.stringify({
    summary: "3시 미팅",
    confidence_score: 0.9,
    metadata: { intent: "SCHEDULE", trust_level_adjustment: "NONE" },
    actions: [
      {
        label: "캘린더",
        icon: "calendar",
        url: "https://calendar.google.com",
      },
    ],
    schedule: {
      is_conflict: false,
      message: "",
      tasks: [{ time: "15:00", task: "팀 미팅" }],
    },
    container: { action: "NONE", title: "", should_save: false },
  })
);
assert.ok(parsed);
assert.equal(parsed!.metadata?.intent, "SCHEDULE");

const conflict = detectScheduleConflict({
  proposed: [{ time: "15:00", task: "새 미팅" }],
  existing: [{ time: "15:10", task: "기존 약속" }],
});
assert.equal(conflict.isConflict, true);

const normalized = normalizeMasterOrchestratorWire({
  wire: parsed!,
  source: "openai",
  existingSchedule: [{ time: "15:10", task: "기존 약속" }],
});
assert.equal(normalized.schedule?.is_conflict, true);

const travel = orchestrateByRules({
  message: "제주 여행 일정 정리해줘",
  masterContext: { currentDate: "2026-05-30", trustLevel: 2, existingSchedule: [], activeContainers: [] },
});
assert.equal(travel.container?.should_save, true);

console.log("test-master-orchestrator: ok");
