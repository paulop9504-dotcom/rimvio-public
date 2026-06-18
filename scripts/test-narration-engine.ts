#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import type { EventBehaviorPolicy } from "../lib/behavior-engine/types";
import type { ContainerRoute } from "../lib/container-rework/types";
import { mergeDecisionEntries } from "../lib/container-rework/types";
import type { NotificationExecutionDecision } from "../lib/notification-shadow/types";
import { composeNarrations } from "../lib/narration-engine/compose-narrations";
import { listNarrationsFromStore } from "../lib/narration-engine/list-narrations-from-store";
import { resetEventCandidatesForTests } from "../lib/events/event-store";
import type { EventCandidate } from "../lib/events/event-candidate";
import type { EventOpportunitySignal } from "../lib/opportunity-engine/types";

const now = new Date("2026-06-01T16:55:00");

const opportunity: EventOpportunitySignal = {
  ecId: "ec-notif",
  score: 0.88,
  reason: "치과: active now, imminent, in focus",
  priority: "HIGH",
};

const behavior: EventBehaviorPolicy = {
  ecId: "ec-notif",
  show_in_dock: true,
  highlight: "HIGH",
  auto_nudge: true,
  notification: true,
  suppress: false,
};

const notification: NotificationExecutionDecision = {
  ecId: "ec-notif",
  send_notification: true,
  timing: "immediate",
  should_block_duplicate: false,
  suppress_final: false,
  reason: "high priority nudge",
};

const route: ContainerRoute = {
  ecId: "ec-notif",
  primary_container: "notification_surface",
  dock: false,
  chat: false,
  timeline: true,
  notification_surface: true,
  suppressed_containers: ["dock", "chat"],
  reason: "high nudge — notification primary",
};

const event: EventCandidate = {
  id: "ec-notif",
  title: "치과",
  category: "schedule",
  source: "message",
  lifecycle: "active",
  datetime: "2026-06-01T17:00:00",
  confidence: 0.9,
  metadata: {},
  lifecycleUpdatedAt: now.toISOString(),
  createdAt: now.toISOString(),
  updatedAt: now.toISOString(),
};

const entries = mergeDecisionEntries({
  opportunities: [opportunity],
  behaviors: [behavior],
  notifications: [notification],
});

const narrations = composeNarrations(
  entries,
  [route],
  () => event,
  { now, recentEcIds: ["ec-notif"] }
);

assert.equal(narrations.length, 1);
assert.equal(narrations[0]!.ecId, "ec-notif");
assert.match(narrations[0]!.explanation, /치과/);
assert.match(narrations[0]!.explanation, /알림/);
assert.ok(narrations[0]!.reason_tags.includes("time_sensitive"));
assert.ok(narrations[0]!.reason_tags.includes("high_priority"));
assert.ok(narrations[0]!.reason_tags.includes("recent_interaction"));
assert.ok(narrations[0]!.reason_tags.includes("notification_nudge"));
assert.ok(!narrations[0]!.explanation.includes("ContainerRework"));
assert.ok(!narrations[0]!.explanation.includes("Opportunity"));

const silentRoute: ContainerRoute = {
  ecId: "ec-hidden",
  primary_container: "timeline",
  dock: false,
  chat: false,
  timeline: true,
  notification_surface: false,
  suppressed_containers: ["dock", "chat", "notification_surface"],
  reason: "suppressed — timeline silent shadow",
};

const silent = composeNarrations(
  mergeDecisionEntries({ behaviors: [{ ...behavior, ecId: "ec-hidden", suppress: true }] }),
  [silentRoute],
  () => null,
  { now }
);
assert.deepEqual(silent, []);

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

const pipeline = listNarrationsFromStore({
  opportunityContext: { now, maxResults: 3 },
  notificationContext: { now },
});
assert.ok(Array.isArray(pipeline));
assert.ok(pipeline.length >= 1);
assert.ok(pipeline.every((item) => item.explanation.length > 0));

resetEventCandidatesForTests([]);
console.log("test-narration-engine: ok");
