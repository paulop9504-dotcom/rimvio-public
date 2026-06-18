#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import type { ContainerRoute } from "../lib/container-rework/types";
import { composeDockFeed } from "../lib/dock-feed/compose-dock-feed";
import { listDockFeedFromStore } from "../lib/dock-feed/list-dock-feed";
import { resetEventCandidatesForTests } from "../lib/events/event-store";
import type { EventCandidate } from "../lib/events/event-candidate";

const events = new Map<string, EventCandidate>([
  [
    "ec-notif",
    {
      id: "ec-notif",
      title: "치과",
      category: "schedule",
      source: "message",
      lifecycle: "active",
      datetime: "2026-06-01T17:00:00",
      place: "강남",
      confidence: 0.9,
      metadata: {},
      lifecycleUpdatedAt: "2026-06-01T16:55:00.000Z",
      createdAt: "2026-06-01T16:55:00.000Z",
      updatedAt: "2026-06-01T16:55:00.000Z",
    },
  ],
  [
    "ec-dock",
    {
      id: "ec-dock",
      title: "미팅",
      category: "work",
      source: "message",
      lifecycle: "scheduled",
      datetime: "2026-06-01T18:00:00",
      confidence: 0.8,
      metadata: {},
      lifecycleUpdatedAt: "2026-06-01T16:55:00.000Z",
      createdAt: "2026-06-01T16:55:00.000Z",
      updatedAt: "2026-06-01T16:55:00.000Z",
    },
  ],
  [
    "ec-timeline",
    {
      id: "ec-timeline",
      title: "저녁",
      category: "food",
      source: "message",
      lifecycle: "mentioned",
      confidence: 0.4,
      metadata: {},
      lifecycleUpdatedAt: "2026-06-01T16:55:00.000Z",
      createdAt: "2026-06-01T16:55:00.000Z",
      updatedAt: "2026-06-01T16:55:00.000Z",
    },
  ],
]);

const resolveEvent = (ecId: string) => events.get(ecId) ?? null;

const notifRoute: ContainerRoute = {
  ecId: "ec-notif",
  primary_container: "notification_surface",
  dock: false,
  chat: false,
  timeline: true,
  notification_surface: true,
  suppressed_containers: ["dock", "chat"],
  reason: "high nudge — notification primary",
};

const dockRoute: ContainerRoute = {
  ecId: "ec-dock",
  primary_container: "dock",
  dock: true,
  chat: false,
  timeline: true,
  notification_surface: false,
  suppressed_containers: ["chat"],
  reason: "medium — dock primary, timeline secondary",
};

const timelineRoute: ContainerRoute = {
  ecId: "ec-timeline",
  primary_container: "timeline",
  dock: false,
  chat: false,
  timeline: true,
  notification_surface: false,
  suppressed_containers: ["dock", "chat", "notification_surface"],
  reason: "low — timeline only",
};

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

const feed = composeDockFeed(
  [dockRoute, notifRoute, timelineRoute, silentRoute],
  resolveEvent,
  { focusedEcId: "ec-notif" }
);
assert.notEqual(feed, "NO_ACTION");
assert.ok(Array.isArray(feed));
assert.equal(feed.length, 3);
assert.equal(feed[0]!.ecId, "ec-notif");
assert.equal(feed[0]!.render_mode, "full");
assert.equal(feed[0]!.priority_visual_state, "HIGH");
assert.equal(feed[0]!.highlight, true);
assert.equal(feed[1]!.ecId, "ec-dock");
assert.equal(feed[1]!.render_mode, "full");
assert.equal(feed[2]!.ecId, "ec-timeline");
assert.equal(feed[2]!.render_mode, "dimmed");
assert.ok(!feed.some((item) => item.ecId === "ec-hidden"));

const hidden = composeDockFeed([silentRoute], resolveEvent);
assert.ok(Array.isArray(hidden));
assert.equal(hidden.length, 0);

const invisible = composeDockFeed([dockRoute], resolveEvent, { dockVisible: false });
assert.deepEqual(invisible, []);

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

const pipeline = listDockFeedFromStore({
  opportunityContext: { now, maxResults: 3 },
  notificationContext: { now },
});
assert.notEqual(pipeline, "NO_ACTION");
assert.ok(Array.isArray(pipeline));
assert.ok(pipeline.length >= 1);
assert.equal(pipeline[0]!.ecId, "ec-pipeline");

resetEventCandidatesForTests([]);
console.log("test-dock-feed: ok");
