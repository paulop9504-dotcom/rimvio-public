#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { classifyScheduleIntent } from "../lib/peer-chat/ai-lens/classify-schedule-intent";
import { detectScheduleConflict } from "../lib/peer-chat/ai-lens/detect-schedule-conflict";
import { executeDeepLinkBubbleCandidate } from "../lib/peer-chat/ai-lens/execute-lens-bubble";
import { commitLensScheduleFromConfirm } from "../lib/peer-chat/ai-lens/commit-schedule-from-lens";
import {
  combineScheduleEditFields,
  formatScheduleConfirmWhen,
  parseScheduleEditFields,
} from "../lib/peer-chat/ai-lens/resolve-schedule-datetime";
import type { DeepLinkBubbleCandidate } from "../lib/peer-chat/ai-lens/types";
import type { EventCandidate } from "../lib/events/event-candidate";
import {
  listEventCandidates,
  resetEventCandidatesForTests,
} from "../lib/events/event-store";

const scheduleCandidate: DeepLinkBubbleCandidate = {
  id: "lens-schedule-1",
  actionType: "schedule",
  label: "📅 금요일 저녁 약속",
  score: 1,
  confidence: 0.9,
  reason: "7시 약속",
  deepLink: "rimvio://calendar",
  payload: {
    title: "치킨 약속",
    datetime: "2026-06-05T19:00:00.000Z",
    place: "둔산동",
  },
};

const groupThreadId = "peer-group-22222222-2222-2222-2222-222222222222";

const open = executeDeepLinkBubbleCandidate(scheduleCandidate, {
  sourceMessageId: "msg-1",
  peerDisplayName: "황정성",
  peerThreadId: groupThreadId,
});
assert.equal(open.ok, true);
assert.ok(open.openScheduleConfirm);
assert.equal(open.openScheduleConfirm!.title, "치킨 약속");
assert.equal(open.openScheduleConfirm!.peerDisplayName, "황정성");
assert.equal(open.openScheduleConfirm!.conflict.kind, "none");
assert.ok(open.openScheduleConfirm!.planContext);
assert.equal(open.openScheduleConfirm!.planAttach.canContinue, false);
assert.equal(open.openScheduleConfirm!.planContext.peerThreadId, groupThreadId);
assert.equal(open.openScheduleConfirm!.planContext.planMode, "group");

const planIntent = classifyScheduleIntent({
  title: "수능 공부 루틴 계획",
  actionType: "schedule",
  hasDatetime: false,
});
assert.equal(planIntent.kind, "plan");
assert.equal(planIntent.suggestFeed, true);

const overlapEvents: EventCandidate[] = [
  {
    id: "ec-1",
    title: "병원",
    category: "schedule",
    source: "message",
    lifecycle: "scheduled",
    datetime: "2026-06-05T19:30:00.000Z",
    confidence: 0.8,
    lifecycleUpdatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];
const overlap = detectScheduleConflict({
  title: "치킨 약속",
  datetime: "2026-06-05T19:00:00.000Z",
  events: overlapEvents,
});
assert.equal(overlap.kind, "overlap");
assert.ok(overlap.headline.includes("그 시간"));

resetEventCandidatesForTests();
const saved = commitLensScheduleFromConfirm({
  candidate: scheduleCandidate,
  sourceMessageId: "msg-1",
  peerDisplayName: "황정성",
  promoteToFeed: false,
  intent: open.openScheduleConfirm!.intent,
  datetimeIso: scheduleCandidate.payload?.datetime,
  title: "치킨 약속",
  place: "둔산동",
  planContext: open.openScheduleConfirm!.planContext,
});
assert.equal(saved.ok, true);
assert.ok(saved.message.includes("캘린더"));

const committed = listEventCandidates().find((row) => row.id === saved.eventId);
assert.ok(committed);
assert.equal(committed?.metadata?.planPeerThreadId, groupThreadId);
assert.equal(committed?.metadata?.lensSource, "peer_chat");

const dup = detectScheduleConflict({
  title: "치킨 약속",
  datetime: "2026-06-05T19:00:00.000Z",
  sourceMessageId: "msg-1",
  events: listEventCandidates(),
});
assert.equal(dup.kind, "duplicate");

assert.ok(formatScheduleConfirmWhen("2026-06-05T19:00:00.000Z").length > 3);

const localRef = new Date(2026, 5, 5, 15, 30, 0, 0);
const parsed = parseScheduleEditFields(localRef.toISOString());
assert.equal(parsed.date, "2026-06-05");
assert.equal(parsed.time, "15:30");
const recombined = combineScheduleEditFields("2026-06-06", "09:00");
assert.ok(recombined);
assert.equal(new Date(recombined!).getDate(), 6);
assert.equal(new Date(recombined!).getHours(), 9);

console.log("test-schedule-lens-confirm: ok");
