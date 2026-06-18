import assert from "node:assert/strict";
import { resolveTemporalExpression } from "../lib/time/temporal-resolver";
import { hasTemporalSchedulePattern } from "../lib/time/temporal-parsing-protocol";
import { orchestrateTemporalSchedule } from "../lib/global-brain/orchestrate-temporal-schedule";

const ref = new Date("2026-05-29T12:00:00+09:00");
const referenceDate = "2026-05-29";

assert.ok(hasTemporalSchedulePattern("1달 뒤에 치과"));
assert.ok(hasTemporalSchedulePattern("3일 후 미팅"));
assert.ok(hasTemporalSchedulePattern("다음 주 금요일"));
assert.ok(hasTemporalSchedulePattern("10분 안에 출발"));

const tenMinutes = resolveTemporalExpression({
  message: "10분 안에 출발",
  referenceDate,
  now: ref,
});
assert.ok(tenMinutes);
assert.equal(tenMinutes!.offsetMinutes, 10);
assert.equal(tenMinutes!.iso, "2026-05-29T12:10:00");

const oneHour = resolveTemporalExpression({
  message: "1시간 안에 미팅",
  referenceDate,
  now: ref,
});
assert.ok(oneHour);
assert.equal(oneHour!.offsetMinutes, 60);
assert.equal(oneHour!.iso, "2026-05-29T13:00:00");

const oneMonth = resolveTemporalExpression({
  message: "1달 뒤에 치과 가야 함",
  referenceDate,
  now: ref,
});
assert.ok(oneMonth);
assert.equal(oneMonth!.dateKey, "2026-06-29");
assert.match(oneMonth!.iso, /^2026-06-29T/);

const threeDays = resolveTemporalExpression({
  message: "3일 뒤 미팅",
  referenceDate,
  now: ref,
});
assert.ok(threeDays);
assert.equal(threeDays!.dateKey, "2026-06-01");

const english = resolveTemporalExpression({
  message: "in 3 days dentist",
  referenceDate,
  now: ref,
});
assert.ok(english);
assert.equal(english!.dateKey, "2026-06-01");

const card = orchestrateTemporalSchedule({
  message: "1달 뒤에 치과 가야 함",
  referenceDate,
  now: ref,
});
assert.ok(card);
assert.ok(card!.confirmation);
assert.equal(card!.confirmation!.confirm_data?.subject, "2026-06-29");
assert.equal(card!.scheduleExtract?.datetime, card!.confirmation!.extracted_data?.datetime);
assert.match(card!.summary, /6월 29일|2026-06-29/u);

console.log("test-temporal-resolver: ok");
