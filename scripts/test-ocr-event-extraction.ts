#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import {
  extractEventsFromOcr,
  formatOcrEventExtractionJson,
} from "../lib/events/extract-events-from-ocr";

const REF = "2026-06-01";

const navigateOcr = `
6월 2일
14:00-15:30 팀 회의
`.trim();

const r1 = extractEventsFromOcr(navigateOcr, { referenceDate: REF });
assert.equal(r1.events.length, 1);
assert.match(r1.events[0]!.title, /회의/);
assert.match(r1.events[0]!.start, /2026-06-02T14:00:00/);
assert.match(r1.events[0]!.end, /2026-06-02T15:30:00/);
assert.equal(r1.events[0]!.date, "2026-06-02");
assert.ok(r1.events[0]!.confidence >= 0.85);

const priceOcr = `
삼성전자 가격표
12,000원
`.trim();

const r2 = extractEventsFromOcr(priceOcr, { referenceDate: REF });
assert.equal(r2.events.length, 0, "non-schedule OCR must not emit events");

const airportOcr = `인천공항 가는 길 안내`.trim();
const r3 = extractEventsFromOcr(airportOcr, { referenceDate: REF });
assert.equal(r3.events.length, 0);

const scheduleOcr = `
7시 기상
9~11 보험 상담
11:30 점심
14시 병원
16시 고객 미팅
저녁에 운동
`.trim();

const rSchedule = extractEventsFromOcr(scheduleOcr, { referenceDate: REF });
assert.ok(rSchedule.events.length >= 5);
assert.ok(rSchedule.events.some((e) => e.title.includes("보험")));
assert.ok(rSchedule.events.some((e) => e.title.includes("운동")));
assert.ok(
  rSchedule.events.every((e) => e.date === null),
  "time-only OCR lines must not infer reference calendar date"
);
assert.ok(rSchedule.events.every((e) => e.time !== null));

const ambiguousOcr = `
오늘
3시 치과
`.trim();

const r4 = extractEventsFromOcr(ambiguousOcr, { referenceDate: REF });
assert.equal(r4.events.length, 1);
assert.match(r4.events[0]!.title, /치과/);
assert.ok(r4.events[0]!.reason.includes("tentative"));
assert.ok(r4.events[0]!.confidence < 0.7);

const json = formatOcrEventExtractionJson(r1);
const parsed = JSON.parse(json) as { events: unknown[] };
assert.ok(Array.isArray(parsed.events));
assert.equal(Object.keys(parsed).join(","), "events");

const source = formatOcrEventExtractionJson({ events: [] });
assert.ok(!source.includes("upsertEventCandidate"));
assert.ok(!source.includes("calendar"));

console.log("test-ocr-event-extraction: ok");
