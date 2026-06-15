#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  DEEP_RETRIEVAL_USER_IN_LOOP,
  runDeepScheduleRetrieval,
} from "../lib/schedule-intelligence/deep-schedule-retrieval";
import { extractRetrievalKeywords } from "../lib/schedule-intelligence/extract-retrieval-keywords";
import { analyzeScheduleQuery } from "../lib/schedule-intelligence/parse-schedule-query";

const referenceDate = "2026-05-29";

const reminders = [
  {
    id: "r1",
    title: "치과 예약",
    fireAt: "2026-05-30T05:00:00.000",
  },
  {
    id: "r2",
    title: "팀 미팅",
    fireAt: "2026-05-29T03:00:00.000",
  },
];

const activitySources = [
  {
    id: "a1",
    title: "치과 방문",
    text: "치과 방문 알림",
    timestamp: "2026-05-30T04:00:00.000",
    fireAt: "2026-05-30T05:30:00.000",
    source: "notification_shadow" as const,
  },
];

// Stage 1 — strict keyword match
const q1 = "내일 치과 일정 알려줘";
const a1 = analyzeScheduleQuery({ message: q1, referenceDate })!;
const keywords = extractRetrievalKeywords(q1, a1);
assert.ok(keywords.some((k) => /치과/u.test(k)));

const s1 = runDeepScheduleRetrieval({
  message: q1,
  analysis: a1,
  context: { referenceDate, reminders, activitySources: [] },
});
assert.equal(s1.retrievalStage, 1);
assert.ok(s1.items.some((item) => /치과/u.test(item.title)));

// Stage 2 — loose partial match +24h
const s2 = runDeepScheduleRetrieval({
  message: "내일 치과예약 언제야?",
  analysis: {
    tier: "retrieval",
    kind: "time_range",
    label: "time_range",
    dateKey: "2026-05-30",
  },
  context: {
    referenceDate,
    reminders: [{ id: "x", title: "○○치과 방문", fireAt: "2026-05-30T06:00:00.000" }],
    activitySources: [],
  },
});
assert.ok(s2.retrievalStage === 1 || s2.retrievalStage === 2);
assert.ok(s2.items.length > 0);

// Stage 3 — activity log when calendar empty
const s3 = runDeepScheduleRetrieval({
  message: "가장 최근 '치과' 관련 일정이 언제야?",
  analysis: analyzeScheduleQuery({
    message: "가장 최근 '치과' 관련 일정이 언제야?",
    referenceDate,
  })!,
  context: { referenceDate, reminders: [], activitySources },
});
assert.equal(s3.retrievalStage, 3);
assert.ok(s3.items.some((item) => item.source === "notification"));

// Stage 4 — user in the loop
const s4 = runDeepScheduleRetrieval({
  message: "김민중님 일정",
  analysis: analyzeScheduleQuery({
    message: "김민중님 관련 일정",
    referenceDate,
  })!,
  context: { referenceDate, reminders: [], activitySources: [] },
});
assert.equal(s4.retrievalStage, 4);
assert.equal(s4.userInLoop, true);
assert.equal(s4.emptyMessage, DEEP_RETRIEVAL_USER_IN_LOOP);

console.log("test-deep-retrieval: ok");
