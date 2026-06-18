#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { resetUserGoalsForTests } from "../lib/goal-roadmap/goal-roadmap-store";
import { orchestrateGoalAlignment } from "../lib/goal-roadmap/orchestrate-goal-alignment";
import { applyReschedulePropagation } from "../lib/schedule-intelligence/apply-reschedule-propagation";
import { orchestrateScheduleIntelligence } from "../lib/schedule-intelligence/orchestrate-schedule-intelligence";
import {
  analyzeScheduleQuery,
  isScheduleIntelligenceQuery,
} from "../lib/schedule-intelligence/parse-schedule-query";
import { queryScheduleStore } from "../lib/schedule-intelligence/query-schedule-store";
import { resolveDepartureAdvice } from "../lib/schedule-intelligence/resolve-departure-query";
import { summarizeOverlapPriority } from "../lib/schedule-intelligence/resolve-overlap-priority";
import { buildScheduleRegisterPrompt } from "../lib/schedule-intelligence/schedule-retrieval-action";

async function main() {
const referenceDate = "2026-05-29";
const reminders = [
  {
    id: "r1",
    title: "김민중님 미팅",
    fireAt: "2026-05-30T09:30:00.000",
  },
  {
    id: "r2",
    title: "A 미팅 (Nexus)",
    fireAt: "2026-05-30T10:00:00.000",
  },
  {
    id: "r3",
    title: "B 약속",
    fireAt: "2026-05-30T10:15:00.000",
  },
  {
    id: "r4",
    title: "프로젝트 납품",
    fireAt: "2026-05-29T11:00:00.000",
  },
  {
    id: "r5",
    title: "카페 휴식",
    fireAt: "2026-05-29T14:00:00.000",
  },
];

const goals = [
  {
    id: "g1",
    kind: "revenue" as const,
    label: "월 수익 목표",
    targetValue: 5_000_000,
    unit: "원",
  },
  {
    id: "g2",
    kind: "certification" as const,
    label: "소형 자격증 2종",
    studyHoursPerWeek: 8,
    deadline: "2027-07-30",
  },
];

// Tier 1 — retrieval
const q1 = "내일 오전 9시부터 12시까지 잡힌 일정이 뭐야?";
assert.ok(isScheduleIntelligenceQuery(q1));
const a1 = analyzeScheduleQuery({ message: q1, referenceDate })!;
assert.equal(a1.tier, "retrieval");
assert.equal(a1.kind, "time_range");

const r1 = await orchestrateScheduleIntelligence({
  message: q1,
  referenceDate,
  reminders,
});
assert.ok(r1);
assert.match(r1!.summary, /일정|없/);

const q2 = "이번 주에 완료해야 하는 태스크 리스트 다 불러줘.";
const r2 = await orchestrateScheduleIntelligence({
  message: q2,
  referenceDate,
  reminders,
});
assert.ok(r2);
assert.match(r2!.summary, /이번 주|태스크|일정/u);

const q3 = "가장 최 recent에 입력한 예)'김민중님' 관련 일정이 언제야?".replace(
  " recent",
  "근"
);
const personQuery = "가장 최근에 입력한 '김민중님' 관련 일정이 언제야?";
const r3 = await orchestrateScheduleIntelligence({
  message: personQuery,
  referenceDate,
  reminders,
});
assert.ok(r3);
assert.match(r3!.summary, /김민중/);

// Tier 2 — conflict
const q4 = "내일 A 미팅과 B 약속이 겹치는데, 지금 스케줄에서 더 중요한 게 뭐야?";
const overlap = summarizeOverlapPriority({
  message: q4,
  context: { referenceDate, reminders, goals },
  labelA: "A",
  labelB: "B",
  dateKey: "2026-05-30",
});
assert.ok(overlap);
assert.match(overlap!.summary, /우선|미팅|약속/u);

const q5 =
  "지금 둔산동에 가려고 하는데, 현재 교통 상황에서 2시 반 미팅에 늦지 않게 도착하려면 언제 출발해야 해?";
const departure = await resolveDepartureAdvice({
  analysis: analyzeScheduleQuery({ message: q5, referenceDate })!,
  context: { referenceDate, reminders, goals },
});
assert.ok(departure);
assert.match(departure!.summary, /출발|둔산/u);

const q6 = "A 일정이 30분 미뤄졌어. 이 변경 사항을 내 전체 스케줄에 반영해서 다시 정리해 줄래?";
const propagate = applyReschedulePropagation({
  analysis: analyzeScheduleQuery({ message: q6, referenceDate })!,
  context: { referenceDate, reminders, goals },
});
assert.ok(propagate);
assert.equal(propagate!.delayMinutes, 30);
assert.ok(propagate!.revised.length >= 2);

const r6 = await orchestrateScheduleIntelligence({
  message: q6,
  referenceDate,
  reminders,
});
assert.ok(r6?.schedule?.tasks?.length);

// Tier 3 — goal alignment
const q7 =
  "이번 달 수익 500만 원 목표를 달성하려면, 지금 내 일주일 스케줄에서 무엇을 줄이고 수익 창출 활동을 늘려야 할까?";
const g7 = orchestrateGoalAlignment({
  analysis: analyzeScheduleQuery({ message: q7, referenceDate })!,
  context: { referenceDate, reminders, goals },
});
assert.match(g7.summary, /500|수익/u);
assert.ok(g7.suggestions.length >= 2);

const q8 =
  "내년 7월 자격증 취득(2종 소형)이 목표인데, 6월 스케줄에 공부 시간을 따로 확보해서 끼워 넣어줄 수 있어?";
const g8 = orchestrateGoalAlignment({
  analysis: analyzeScheduleQuery({ message: q8, referenceDate })!,
  context: { referenceDate, reminders, goals },
});
assert.ok(g8.studyBlocks?.length);
assert.match(g8.summary, /공부|6월/u);

const q9 = "오늘 하루를 보냈는데, 내 목표 로드맵과 비교했을 때 오늘 생산성 점수는 몇 점이야? 무엇이 부족했어?";
const g9 = orchestrateGoalAlignment({
  analysis: analyzeScheduleQuery({ message: q9, referenceDate })!,
  context: { referenceDate, reminders, goals },
});
assert.ok(typeof g9.score === "number");
assert.match(g9.summary, /점/u);

const registerPrompt = buildScheduleRegisterPrompt("내일 2시 축구 약속");
assert.match(registerPrompt, /축구/u);
assert.match(registerPrompt, /등록/u);

const rRegister = await orchestrateScheduleIntelligence({
  message: "내일 2시 축구 약속",
  referenceDate,
  reminders: [],
});
assert.equal(rRegister?.actions?.[0]?.label, "일정 알려주기");
assert.equal(
  (rRegister?.actions?.[0]?.payload as { scheduleRegisterPrompt?: string })
    ?.scheduleRegisterPrompt,
  registerPrompt
);

resetUserGoalsForTests();

console.log("test-schedule-intelligence: ok");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
