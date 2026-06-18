import assert from "node:assert/strict";
import {
  globalBrainActionableToMasterWire,
  parseGlobalBrainActionableWire,
} from "../lib/global-brain/global-brain-actionable-output";
import { parseMasterOrchestratorJson } from "../lib/action-chat/wire-to-actions";
import { wireActionsToLinkItems } from "../lib/action-chat/wire-to-actions";
import { buildCurrentSnapshotMarkdown } from "../lib/global-brain/build-snapshot-markdown";
import { buildGlobalBrainSnapshot } from "../lib/global-brain/detect-event-horizon";
import { GLOBAL_BRAIN_PROTOCOL } from "../lib/global-brain/global-brain-protocol";

const sample = JSON.stringify({
  thought: "User is tired but has Apex meetings left.",
  analysis: {
    category: "Apex",
    status_change: "Tired",
    event_conflict: true,
  },
  message: "오늘 일정이 빡빡해요. 덜 급한 미팅부터 미룰까요?",
  main_action: { label: "일정 조정하기", action: "RESCHEDULE" },
  auxiliary_actions: [{ label: "급한 것만", action: "CORE_ONLY" }],
});

const parsed = parseGlobalBrainActionableWire(JSON.parse(sample));
assert.ok(parsed);
assert.equal(parsed!.analysis.category, "Apex");
assert.equal(parsed!.message.includes("일정"), true);

const master = globalBrainActionableToMasterWire(parsed!);
assert.equal(master.summary, parsed!.message);
assert.equal(master.actions.length, 2);

const fromParser = parseMasterOrchestratorJson(sample);
assert.ok(fromParser);
assert.equal(fromParser!.summary, parsed!.message);

const buttons = wireActionsToLinkItems(master.actions);
assert.equal(buttons.length, 2);
assert.equal(
  (buttons[0]?.payload as { globalBrainActionCode?: string })?.globalBrainActionCode,
  "RESCHEDULE"
);

const snapshot = buildGlobalBrainSnapshot({
  referenceDate: "2026-05-31",
  existingSchedule: [
    { time: "19:00", task: "미팅" },
    { time: "20:00", task: "저녁 약속" },
  ],
  userStatus: {
    flag: "tired",
    label: "피곤함",
    vitality: "Haven",
    updatedAt: "2026-05-31T16:00:00",
    expiresAt: "2026-06-01T16:00:00",
  },
  now: new Date("2026-05-31T16:05:00"),
});

const markdown = buildCurrentSnapshotMarkdown(snapshot);
assert.ok(markdown.includes("[CURRENT SNAPSHOT]"));
assert.ok(markdown.includes("Event Horizon Conflict"));
assert.ok(GLOBAL_BRAIN_PROTOCOL.includes("System Error"));

console.log("test-global-brain-actionable: ok");
