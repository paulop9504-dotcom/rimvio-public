#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import {
  eventIdForLinkReminder,
  LINK_REMINDER_SOURCE_REF,
} from "../lib/events/link-reminder-ingest";
import {
  findEventCandidate,
  listEventCandidatesByLifecycle,
  resetEventCandidatesForTests,
} from "../lib/events/event-store";
import {
  isNotificationShadowEvent,
  NOTIFICATION_SHADOW_SOURCE_REF,
  resolveNotificationEventId,
} from "../lib/events/notification-ingest";
import { ingestNotification } from "../lib/notification-shadow/route-notification";
import {
  appendShadowRecord,
  listShadowRecords,
  resetShadowStoreForTests,
} from "../lib/notification-shadow/shadow-store";
import {
  resetLinkRemindersForTests,
  scheduleLinkReminderAt,
} from "../lib/local-links/reminders";

resetEventCandidatesForTests([]);
resetShadowStoreForTests([]);
resetLinkRemindersForTests([]);

const fireAt = new Date("2026-06-15T14:00:00").toISOString();

scheduleLinkReminderAt({
  linkId: "link-zoom",
  title: "Zoom 미팅 링크",
  url: "https://zoom.us/j/123",
  fireAt,
});

const linkEcId = eventIdForLinkReminder("link-zoom");
assert.ok(findEventCandidate(linkEcId));
assert.equal(findEventCandidate(linkEcId)!.metadata?.sourceRef, LINK_REMINDER_SOURCE_REF);

const shadowFromReminder = appendShadowRecord(
  ingestNotification({
    source: "internal",
    source_app: "rimvio",
    title: "Zoom 미팅 링크",
    content: "Zoom 미팅 링크 · https://zoom.us/j/123",
    timestamp: new Date().toISOString(),
    internal_kind: "link_reminder",
    fire_at: fireAt,
    link_id: "link-zoom",
  }),
);

assert.equal(shadowFromReminder.ecId, linkEcId);
assert.equal(
  listEventCandidatesByLifecycle("scheduled").filter((event) => event.id === linkEcId).length,
  1,
  "link reminder notification must not duplicate EventCandidate",
);

resetShadowStoreForTests([]);

const external = appendShadowRecord(
  ingestNotification({
    source: "external",
    source_app: "Zoom",
    title: "투자 미팅",
    content: "10분 후 시작",
    timestamp: "2026-06-15T13:50:00.000Z",
    fire_at: "2026-06-15T14:00:00.000Z",
  }),
);

assert.ok(external.ecId?.startsWith("ec-notif-"), external.ecId);
const externalEvent = findEventCandidate(external.ecId!);
assert.ok(externalEvent);
assert.equal(externalEvent!.metadata?.sourceRef, NOTIFICATION_SHADOW_SOURCE_REF);
assert.ok(isNotificationShadowEvent(externalEvent!));
assert.equal(externalEvent!.source, "notification");
assert.equal(externalEvent!.lifecycle, "scheduled");

const stableId = resolveNotificationEventId({
  source: "external",
  source_app: "Zoom",
  title: "투자 미팅",
  content: "10분 후 시작",
  timestamp: "2026-06-15T13:50:00.000Z",
  fire_at: "2026-06-15T14:00:00.000Z",
});
assert.equal(stableId, external.ecId);

assert.equal(listShadowRecords().length, 1);

console.log("test-notification-event-ingest: ok");
