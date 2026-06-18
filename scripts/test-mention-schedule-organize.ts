import assert from "node:assert/strict";
import {
  buildScheduleOrganizeSnapshot,
  parseScheduleOrganizeScope,
  projectScheduleOrganizeItems,
} from "../lib/action-chat/mention-schedule-organize/build-schedule-organize-snapshot";
import {
  isMentionScheduleOrganizeInput,
  tryBuildMentionScheduleOrganizeTurn,
} from "../lib/action-chat/mention-schedule-organize/commit-mention-schedule-organize-turn";
import type { UnifiedCalendarOverlayRow } from "../lib/calendar/calendar-view-types";

const now = new Date("2026-06-02T10:00:00");

function row(
  id: string,
  title: string,
  hour: number,
  minute: number,
): UnifiedCalendarOverlayRow {
  const startMs = new Date(
    `2026-06-02T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`,
  ).getTime();
  return {
    id,
    event: {
      id: `chip-${id}`,
      layer: "event",
      eventId: id,
      entry: null,
      title,
      dateKey: "2026-06-02",
      startMs,
      hour,
      minute,
      tone: "blue",
      hasTime: true,
    },
    overlayActions: [],
  };
}

assert.equal(parseScheduleOrganizeScope("오늘"), "today");
assert.equal(parseScheduleOrganizeScope("이번 주"), "week");
assert.ok(isMentionScheduleOrganizeInput("@일정정리"));
assert.ok(isMentionScheduleOrganizeInput("@일정정리 오늘"));

const items = projectScheduleOrganizeItems({
  overlayRows: [row("a", "미팅 A", 14, 0), row("b", "미팅 B", 14, 15)],
  now,
  scope: "today",
});
assert.equal(items.length, 2);

const snapshot = buildScheduleOrganizeSnapshot({
  overlayRows: [row("a", "미팅 A", 14, 0), row("b", "미팅 B", 14, 15)],
  now,
});
assert.ok(snapshot.conflictCount >= 1);
assert.ok(snapshot.rebalanceActions.length >= 3);
assert.match(snapshot.summaryLine, /겹침/);

const turn = tryBuildMentionScheduleOrganizeTurn({ text: "@일정정리" });
assert.ok(turn);
assert.ok(turn![1]!.inlineChatScheduleOrganize);

console.log("test-mention-schedule-organize: ok");
