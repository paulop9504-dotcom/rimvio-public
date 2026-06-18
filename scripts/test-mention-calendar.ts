import assert from "node:assert/strict";
import {
  isMentionCalendarInput,
  parseMentionCalendarInput,
  tryBuildMentionCalendarTurn,
} from "../lib/action-chat/mention-calendar/commit-mention-calendar-turn";

assert.equal(parseMentionCalendarInput("@캘린더")?.query, "");
assert.equal(parseMentionCalendarInput("@캘린더 ")?.query, "");
assert.equal(parseMentionCalendarInput("@calendar today")?.query, "today");
assert.equal(parseMentionCalendarInput("＠캘린더")?.query, "");
assert.ok(isMentionCalendarInput("@캘린더"));
assert.ok(!isMentionCalendarInput("@타이머 3분"));

const turn = tryBuildMentionCalendarTurn({ text: "@캘린더" });
assert.ok(turn);
assert.equal(turn!.length, 2);
assert.equal(turn![0]!.role, "user");
assert.equal(turn![1]!.role, "assistant");
assert.ok(turn![1]!.inlineChatCalendar);
assert.equal(turn![1]!.text, "");

console.log("test-mention-calendar: ok");
