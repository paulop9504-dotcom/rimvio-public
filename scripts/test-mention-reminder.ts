import assert from "node:assert/strict";
import {
  eventIdForLinkReminder,
  LINK_REMINDER_SOURCE_REF,
} from "../lib/events/link-reminder-ingest";
import {
  findEventCandidate,
  resetEventCandidatesForTests,
} from "../lib/events/event-store";
import {
  resetLinkRemindersForTests,
  readLinkReminderForLink,
} from "../lib/local-links/reminders";
import {
  parseMentionReminderFireAt,
  parseMentionReminderQuery,
} from "../lib/action-chat/mention-reminder/parse-mention-reminder-query";
import {
  isMentionReminderInput,
  tryBuildMentionReminderTurn,
} from "../lib/action-chat/mention-reminder/commit-mention-reminder-turn";

resetLinkRemindersForTests();
resetEventCandidatesForTests([]);

const ref = "2026-06-02";
assert.ok(parseMentionReminderFireAt("내일 9시", ref));
assert.ok(parseMentionReminderFireAt("30분 뒤", ref));
assert.equal(parseMentionReminderQuery("BTC 9만 되면", ref).fireAtIso, null);
assert.equal(parseMentionReminderQuery("BTC 9만 되면", ref).title, "BTC 9만 되면");
assert.ok(isMentionReminderInput("@알림 BTC 9만 되면"));

const turn = tryBuildMentionReminderTurn({
  text: "@알림 BTC 9만 되면",
  referenceDate: ref,
});
assert.ok(turn);
assert.ok(turn![1]!.inlineChatReminder);
assert.equal(turn![1]!.text, "");

const linkId = turn![1]!.inlineChatReminder!.linkId;
assert.ok(readLinkReminderForLink(linkId));
const event = findEventCandidate(eventIdForLinkReminder(linkId));
assert.ok(event);
assert.equal(event!.metadata?.sourceRef, LINK_REMINDER_SOURCE_REF);

const linkTurn = tryBuildMentionReminderTurn({
  text: "@알림 내일 15시",
  referenceDate: ref,
  activeLink: {
    id: "link-abc",
    title: "기사 제목",
    original_url: "https://example.com/article",
  },
});
assert.ok(linkTurn![1]!.inlineChatReminder);
assert.equal(linkTurn![1]!.inlineChatReminder!.linkId, "link-abc");
assert.equal(linkTurn![1]!.inlineChatReminder!.title, "기사 제목");

console.log("test-mention-reminder: ok");
