#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import type { EventBehaviorPolicy } from "../lib/behavior-engine/types";
import type { NotificationExecutionDecision } from "../lib/notification-shadow/types";
import { routeContainerRework, routeEventContainers } from "../lib/container-rework/route-container-rework";
import { mergeDecisionEntries } from "../lib/container-rework/types";
import { listContainerRoutesFromStore } from "../lib/container-rework/list-container-routes";
import { resetEventCandidatesForTests } from "../lib/events/event-store";
import type { EventCandidate } from "../lib/events/event-candidate";

const highBehavior: EventBehaviorPolicy = {
  ecId: "ec-high",
  show_in_dock: true,
  highlight: "HIGH",
  auto_nudge: true,
  notification: true,
  suppress: false,
};

const highNotification: NotificationExecutionDecision = {
  ecId: "ec-high",
  send_notification: true,
  timing: "immediate",
  should_block_duplicate: false,
  suppress_final: false,
  reason: "high priority nudge",
};

const notifRoute = routeEventContainers({
  ecId: "ec-high",
  behavior: highBehavior,
  notification: highNotification,
})!;
assert.equal(notifRoute.primary_container, "notification_surface");
assert.equal(notifRoute.chat, false);

const dockRoute = routeEventContainers({
  ecId: "ec-high",
  behavior: highBehavior,
  notification: { ...highNotification, send_notification: false, suppress_final: true },
})!;
assert.equal(dockRoute.primary_container, "dock");

const medium: EventBehaviorPolicy = {
  ecId: "ec-medium",
  show_in_dock: true,
  highlight: "MEDIUM",
  auto_nudge: false,
  notification: true,
  suppress: false,
};

const mediumRoute = routeEventContainers({ ecId: "ec-medium", behavior: medium })!;
assert.equal(mediumRoute.primary_container, "dock");
assert.equal(mediumRoute.timeline, true);

const suppressed: EventBehaviorPolicy = {
  ecId: "ec-hidden",
  show_in_dock: false,
  highlight: "NONE",
  auto_nudge: false,
  notification: true,
  suppress: true,
};

const silent = routeEventContainers({ ecId: "ec-hidden", behavior: suppressed })!;
assert.equal(silent.timeline, true);
assert.equal(silent.dock, false);

const merged = routeContainerRework(
  mergeDecisionEntries({
    behaviors: [highBehavior, medium],
    notifications: [highNotification],
  })
);
assert.notEqual(merged, "NO_ACTION");
assert.ok(Array.isArray(merged));

const now = new Date("2026-06-01T16:55:00");
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

const pipeline = listContainerRoutesFromStore({
  opportunityContext: { now, maxResults: 3 },
  notificationContext: { now },
});
assert.notEqual(pipeline, "NO_ACTION");

resetEventCandidatesForTests([]);
console.log("test-container-rework: ok");
