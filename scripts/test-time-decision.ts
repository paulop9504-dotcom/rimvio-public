#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { tryBatchConfirmPriority } from "../lib/action-chat/batch-confirm-priority";
import {
  classifyTimeExpression,
  isRelativeTimeExpression,
} from "../lib/time-decision/classify-time-expression";
import { parseAbsoluteTimeFromText } from "../lib/time-decision/parse-absolute-time";
import { orchestrateTimeDecision } from "../lib/time-decision/orchestrate-time-decision";
import { buildTimeDecisionPromptBlock } from "../lib/time-decision/time-decision-prompt";

const referenceDate = "2026-05-29";

assert.equal(classifyTimeExpression("1시간 뒤 알람").kind, "relative");
assert.equal(classifyTimeExpression("1시 치과예약").kind, "absolute");
assert.ok(isRelativeTimeExpression("30분 후 미팅"));

const relative = orchestrateTimeDecision({
  message: "1시간 뒤 알람",
  referenceDate,
});
assert.ok(relative?.scheduledDelivery);
assert.match(relative!.summary, /타이머|뒤/u);
assert.equal(relative!.presentation?.mode, "TIMELINE");

const pastNow = new Date("2026-05-29T13:14:00");
const pastParsed = parseAbsoluteTimeFromText({
  message: "1시 치과예약",
  referenceDate,
  now: pastNow,
});
assert.ok(pastParsed?.isPastToday);

const pastChoice = orchestrateTimeDecision({
  message: "1시 치과예약",
  referenceDate,
  now: pastNow,
});
assert.ok(pastChoice?.timeChoice);
assert.equal(pastChoice!.timeChoice!.action, "ASK_TIME_CHOICE");
assert.match(pastChoice!.summary, /지난|오늘|내일/u);
assert.ok(pastChoice!.timeChoice!.missing_place_note);
assert.equal(pastChoice!.presentation?.mode, "TIME_CHOICE");

const futureNow = new Date("2026-05-29T11:00:00");
const futureParsed = parseAbsoluteTimeFromText({
  message: "오후 1시 치과 예약",
  referenceDate,
  now: futureNow,
});
assert.ok(futureParsed);
assert.equal(futureParsed!.isPastToday, false);

const futureChoice = orchestrateTimeDecision({
  message: "오후 1시 치과 예약",
  referenceDate,
  now: futureNow,
});
assert.ok(futureChoice?.timeChoice);
assert.match(futureChoice!.summary, /일정|타이머/u);
assert.ok(futureChoice!.timeChoice!.time_locked);

const bothExecute = orchestrateTimeDecision({
  message: "17시 치과 일정 저장하고 타이머도 맞춰줘",
  referenceDate,
  now: futureNow,
});
assert.ok(bothExecute?.scheduledDelivery);
assert.equal(bothExecute!.timeChoiceExecution?.mode, "both");
assert.equal(bothExecute!.timeChoice, undefined);

const timerExecute = orchestrateTimeDecision({
  message: "17시 치과까지 타이머 맞춰줘",
  referenceDate,
  now: futureNow,
});
assert.ok(timerExecute?.scheduledDelivery);
assert.equal(timerExecute!.timeChoiceExecution?.mode, "countdown");

const placeConfirmBlocked = tryBatchConfirmPriority({
  message: "1시 치과예약",
  referenceDate,
});
assert.ok(placeConfirmBlocked?.timeChoice, "place Missing should lose to time verification");

const prompt = buildTimeDecisionPromptBlock({
  message: "1시 치과예약",
  referenceDate,
  currentTime: "13:14",
});
assert.ok(prompt);
assert.match(prompt, /Time Decision Logic/u);
assert.match(prompt, /과거|미래/u);

console.log("test-time-decision: ok");
