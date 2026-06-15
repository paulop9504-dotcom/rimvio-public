import assert from "node:assert/strict";
import {
  normalizeTimeFromText,
  normalizeKoreanHour,
  formatClock24,
  formatKoreanClock24,
} from "../lib/time/normalize-time";
import { parseAbsoluteTimeFromText } from "../lib/time-decision/parse-absolute-time";

assert.equal(normalizeTimeFromText("15시 30분")?.clock, "15:30");
assert.equal(normalizeTimeFromText("15시 30분")?.hour, 15);
assert.equal(normalizeTimeFromText("15:30")?.clock, "15:30");
assert.equal(normalizeTimeFromText("13:00")?.hour, 13);

const afternoon = normalizeTimeFromText("오후 3시");
assert.equal(afternoon?.clock, "15:00");

const bareThree = normalizeTimeFromText("3시");
assert.equal(bareThree?.clock, "03:00");

assert.equal(normalizeKoreanHour({ hour: 15, context: "15시 30분" }).hour, 15);
assert.equal(normalizeKoreanHour({ hour: 15, context: "회의 15시" }).hour, 15);
assert.notEqual(normalizeKoreanHour({ hour: 15, context: "15시" }).hour, 3);

assert.equal(formatClock24(15, 30), "15:30");
assert.equal(formatKoreanClock24(15, 30), "15시 30분");
assert.ok(!formatKoreanClock24(15, 30).includes("오후"));
assert.ok(!formatKoreanClock24(15, 30).includes("3시"));

const parsed1530 = parseAbsoluteTimeFromText({
  message: "15시 30분 미팅",
  referenceDate: "2026-05-29",
});
assert.ok(parsed1530);
assert.equal(parsed1530!.clockLabel, "15시 30분");
assert.match(parsed1530!.iso, /T15:30/);

const parsedPm1 = parseAbsoluteTimeFromText({
  message: "오후 1시 치과",
  referenceDate: "2026-05-29",
});
assert.ok(parsedPm1);
assert.equal(parsedPm1!.clockLabel, "13시");
assert.match(parsedPm1!.iso, /T13:00/);

console.log("test-normalize-time: ok");
