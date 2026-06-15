import assert from "node:assert/strict";
import {
  parseScheduleListBatch,
  parseScheduleListFromText,
} from "../lib/schedule/parse-schedule-list-batch";
import { orchestrateScheduleListBatch } from "../lib/global-brain/orchestrate-schedule-list-batch";
import { orchestrateTimeDecision } from "../lib/time-decision/orchestrate-time-decision";

const SAMPLE = `2026-06-03 (수) 일정들

09:00 핵심 업무 1순위 처리 (Deep Work) [Apex]
10:30 뇌 부하 해소를 위한 의도적 휴식 [Haven]
11:00 협업 미팅 및 중간 점검 [Nexus]
12:30 점심 식사 및 환기 [Haven]
13:30 실행 중심 업무 처리 [Apex]
16:00 외부 연락 및 네트워킹 [Nexus]
17:30 금일 성과 정리 및 내일 리스크 체크 [Sentinel]`;

const parsed = parseScheduleListFromText(SAMPLE, "2026-05-29");
assert.ok(parsed);
assert.equal(parsed!.dateKey, "2026-06-03");
assert.equal(parsed!.items.length, 7);
assert.equal(parsed!.items[0]!.time, "09:00");
assert.equal(parsed!.items[6]!.time, "17:30");
assert.equal(parsed!.items[0]!.vitality, "Apex");

const batch = orchestrateScheduleListBatch({
  message: SAMPLE,
  referenceDate: "2026-05-29",
});
assert.ok(batch);
assert.equal(batch!.confirmation?.batch_pending?.length, 7);
assert.match(batch!.summary, /7개/);
assert.equal(batch!.batchResults?.length, 7);

const timeOnlyFirst = orchestrateTimeDecision({
  message: SAMPLE,
  referenceDate: "2026-05-29",
});
assert.ok(
  !timeOnlyFirst || (timeOnlyFirst.confirmation?.batch_pending?.length ?? 0) <= 1,
  "single time decision must not replace full batch"
);

const jsonSample = `등록해줘
[
  {"time":"09:00","task":"핵심 업무","category":"Apex"},
  {"time":"10:30","task":"휴식","category":"Haven"}
]`;
const jsonParsed = parseScheduleListBatch(jsonSample, "2026-06-03");
assert.ok(jsonParsed);
assert.equal(jsonParsed!.items.length, 2);
assert.equal(jsonParsed!.source, "json");

console.log("test-schedule-list-batch: ok");
