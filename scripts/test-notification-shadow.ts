#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import type { EventBehaviorPolicy } from "../lib/behavior-engine/types";
import {
  decideNotificationExecutions,
  decideNotificationExecution,
} from "../lib/notification-shadow/decide-notification-executions";
import { listNotificationExecutionsFromStore } from "../lib/notification-shadow/list-notification-executions";
import { resetEventCandidatesForTests } from "../lib/events/event-store";
import type { EventCandidate } from "../lib/events/event-candidate";

const now = new Date("2026-06-01T16:55:00");

const highNudge: EventBehaviorPolicy = {
  ecId: "ec-high",
  show_in_dock: true,
  highlight: "HIGH",
  auto_nudge: true,
  notification: true,
  suppress: false,
};

const suppressed: EventBehaviorPolicy = {
  ecId: "ec-hidden",
  show_in_dock: false,
  highlight: "NONE",
  auto_nudge: false,
  notification: true,
  suppress: true,
};

const medium: EventBehaviorPolicy = {
  ecId: "ec-medium",
  show_in_dock: true,
  highlight: "MEDIUM",
  auto_nudge: false,
  notification: true,
  suppress: false,
};

const immediate = decideNotificationExecution(highNudge, { now })!;
assert.equal(immediate.send_notification, true);
assert.equal(immediate.timing, "immediate");
assert.equal(immediate.suppress_final, false);

const blocked = decideNotificationExecution(highNudge, {
  now,
  dockFocusedEcId: "ec-high",
})!;
assert.equal(blocked.send_notification, false);
assert.equal(blocked.suppress_final, true);

const dup = decideNotificationExecution(highNudge, {
  now,
  recentNotifications: [{ ecId: "ec-high", sentAt: now.toISOString() }],
})!;
assert.equal(dup.should_block_duplicate, true);
assert.equal(dup.send_notification, false);

const hidden = decideNotificationExecution(suppressed, { now })!;
assert.equal(hidden.suppress_final, true);

const batched = decideNotificationExecutions([medium, {
  ...medium,
  ecId: "ec-medium-2",
  highlight: "MEDIUM",
}], { now });
assert.notEqual(batched, "NO_ACTION");
assert.ok(Array.isArray(batched));
assert.equal(batched.some((item) => item.timing === "batch"), true);

assert.equal(decideNotificationExecutions([]), "NO_ACTION");

const ts = now.toISOString();
resetEventCandidatesForTests([
  {
    id: "ec-pipeline",
    title: "치과",
    category: "schedule",
    source: "message",
    lifecycle: "active",
    datetime: "2026-06-01T17:00:00",
    confidence: 0.9,
    metadata: {},
    lifecycleUpdatedAt: ts,
    createdAt: ts,
    updatedAt: ts,
  } satisfies EventCandidate,
]);

const pipeline = listNotificationExecutionsFromStore({
  opportunityContext: { now, maxResults: 3 },
  notificationContext: { now },
});
assert.notEqual(pipeline, "NO_ACTION");

resetEventCandidatesForTests([]);
console.log("test-notification-shadow: ok");
