#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  buildFireAtFromDateTime,
  demoteLinkFromActionStream,
} from "../lib/dual-mode/link-lifecycle";
import {
  readLinkReminderForLink,
  resetLinkRemindersForTests,
  scheduleLinkReminderAt,
} from "../lib/local-links/reminders";

resetLinkRemindersForTests();

const fireAt = buildFireAtFromDateTime("2026-05-30", "15:00");
assert.equal(fireAt, "2026-05-30T15:00:00");

scheduleLinkReminderAt({
  linkId: "dual-link-1",
  title: "갤러리아 기사",
  url: "https://example.com/galleria",
  fireAt,
});

assert.ok(readLinkReminderForLink("dual-link-1"));
demoteLinkFromActionStream("dual-link-1");
assert.equal(readLinkReminderForLink("dual-link-1"), null);

console.log("test-dual-mode-lifecycle: ok");
