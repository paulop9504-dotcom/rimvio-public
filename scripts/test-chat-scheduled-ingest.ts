#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { cancelChatScheduledEventDelivery } from "../lib/action-chat/arm-scheduled-action-delivery";
import {
  archiveChatScheduledEvent,
  CHAT_SCHEDULED_SOURCE_REF,
  eventIdForChatScheduled,
  ingestChatScheduledEvent,
  isChatScheduledEvent,
} from "../lib/events/chat-scheduled-ingest";
import { findEventCandidate, resetEventCandidatesForTests } from "../lib/events/event-store";

resetEventCandidatesForTests([]);

const scopeId = "chat-scope-1";
const messageId = "msg-scheduled-1";
const extracted = {
  datetime: "2026-06-15T15:00:00",
  place_name: "강남역",
  address: "강남역 1번 출구",
  phone: null,
  url: null,
  schedule_note: "미팅",
};

ingestChatScheduledEvent({
  messageId,
  extracted,
  sourceMessage: "내일 3시 강남역 미팅",
  scopeId,
});

const ecId = eventIdForChatScheduled(messageId);
assert.equal(ecId, "ec-chat-msg-scheduled-1");

const event = findEventCandidate(ecId);
assert.ok(event, "scheduled delivery must ingest EventCandidate");
assert.equal(event!.lifecycle, "scheduled");
assert.equal(event!.metadata?.sourceRef, CHAT_SCHEDULED_SOURCE_REF);
assert.ok(isChatScheduledEvent(event!));
assert.equal(event!.datetime, extracted.datetime);
assert.equal(event!.title, "강남역");

archiveChatScheduledEvent(messageId);
assert.equal(findEventCandidate(ecId)?.lifecycle, "archived");

resetEventCandidatesForTests([]);
ingestChatScheduledEvent({ messageId, extracted, scopeId });
cancelChatScheduledEventDelivery(scopeId, messageId);
assert.equal(findEventCandidate(ecId)?.lifecycle, "archived");

console.log("test-chat-scheduled-ingest: ok");
