import assert from "node:assert/strict";
import {
  countScheduleLines,
  parseScheduleListBatch,
  parseScheduleListFromText,
} from "../lib/schedule/parse-schedule-list-batch";
import { orchestrateScheduleListBatch } from "../lib/global-brain/orchestrate-schedule-list-batch";
import { orchestrateTimeDecision } from "../lib/time-decision/orchestrate-time-decision";

const MSG = `6월2일 일과
07:00 기상
08:00 출근
10:00 Zoom 회의
12:00 점심 약속
14:00 치과
18:00 헬스장
20:00 친구 생일
23:00 취침`;

const parsed = parseScheduleListFromText(MSG, "2026-05-31");
assert.ok(parsed, "should parse 8-line day plan");
assert.equal(parsed!.items.length, 8);
assert.equal(parsed!.dateKey, "2026-06-02");
assert.equal(parsed!.items[0]!.task, "기상");
assert.equal(parsed!.items[0]!.time, "07:00");

const batch = orchestrateScheduleListBatch({
  message: MSG,
  referenceDate: "2026-05-31",
});
assert.ok(batch);
assert.equal(batch!.confirmation?.batch_pending?.length, 8);
assert.match(batch!.summary, /8개/);

const timeDecision = orchestrateTimeDecision({
  message: MSG,
  referenceDate: "2026-05-31",
  now: new Date("2026-05-31T06:00:00"),
});
assert.equal(
  timeDecision?.scheduledDelivery?.status ?? null,
  null,
  "time decision must not hijack multi-line schedule batch"
);

assert.equal(countScheduleLines(MSG), 8);

console.log("test-schedule-korean-batch: ok");
