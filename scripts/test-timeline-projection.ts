#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import type { ContainerRoute } from "../lib/container-rework/types";
import { composeTimelineProjection } from "../lib/timeline-projection/compose-timeline-projection";
import { listTimelineProjectionFromStore } from "../lib/timeline-projection/list-timeline-projection";
import { resetEventCandidatesForTests } from "../lib/events/event-store";
import type { EventCandidate } from "../lib/events/event-candidate";

const now = new Date("2026-06-01T16:55:00");

const events = new Map<string, EventCandidate>([
  [
    "ec-today",
    {
      id: "ec-today",
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
    },
  ],
  [
    "ec-tomorrow",
    {
      id: "ec-tomorrow",
      title: "미팅",
      category: "work",
      source: "message",
      lifecycle: "scheduled",
      datetime: "2026-06-02T10:00:00",
      confidence: 0.8,
      metadata: {},
      lifecycleUpdatedAt: now.toISOString(),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    },
  ],
  [
    "ec-week",
    {
      id: "ec-week",
      title: "저녁",
      category: "food",
      source: "message",
      lifecycle: "scheduled",
      datetime: "2026-06-05T19:00:00",
      confidence: 0.7,
      metadata: {},
      lifecycleUpdatedAt: now.toISOString(),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    },
  ],
  [
    "ec-later",
    {
      id: "ec-later",
      title: "출장",
      category: "travel",
      source: "message",
      lifecycle: "scheduled",
      datetime: "2026-06-20T09:00:00",
      confidence: 0.6,
      metadata: {},
      lifecycleUpdatedAt: now.toISOString(),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    },
  ],
]);

const resolveEvent = (ecId: string) => events.get(ecId) ?? null;

function route(
  ecId: string,
  primary: ContainerRoute["primary_container"],
  reason: string,
  flags: Partial<ContainerRoute> = {}
): ContainerRoute {
  return {
    ecId,
    primary_container: primary,
    dock: primary === "dock",
    chat: false,
    timeline: true,
    notification_surface: primary === "notification_surface",
    suppressed_containers: [],
    reason,
    ...flags,
  };
}

const routes: ContainerRoute[] = [
  route("ec-today", "notification_surface", "high nudge — notification primary"),
  route("ec-tomorrow", "dock", "medium — dock primary, timeline secondary"),
  route("ec-week", "timeline", "low — timeline only"),
  route("ec-later", "dock", "medium — dock primary, timeline secondary"),
  {
    ecId: "ec-hidden",
    primary_container: "timeline",
    dock: false,
    chat: false,
    timeline: true,
    notification_surface: false,
    suppressed_containers: ["dock", "chat", "notification_surface"],
    reason: "suppressed — timeline silent shadow",
  },
];

const projection = composeTimelineProjection(routes, resolveEvent, { now });
assert.ok(Array.isArray(projection));
assert.equal(projection.length, 4);
assert.equal(projection[0]!.section, "Today");
assert.equal(projection[0]!.items[0]!.ecId, "ec-today");
assert.equal(projection[0]!.items[0]!.visual_state, "expanded");
assert.equal(projection[0]!.items[0]!.priority, "HIGH");
assert.equal(projection[1]!.section, "Tomorrow");
assert.equal(projection[2]!.section, "Week");
assert.equal(projection[2]!.items[0]!.visual_state, "dimmed");
assert.equal(projection[3]!.section, "Later");
assert.ok(!projection.some((section) => section.items.some((item) => item.ecId === "ec-hidden")));

const noTime = composeTimelineProjection(
  [route("ec-no-time", "dock", "medium — dock primary, timeline secondary")],
  () => null,
  { now }
);
assert.deepEqual(noTime, []);

const pipelineNow = new Date();
const pipelineStart = new Date(pipelineNow.getTime() + 60 * 60 * 1000);
const pipelineTs = pipelineNow.toISOString();
resetEventCandidatesForTests([
  {
    id: "ec-pipeline",
    title: "치과",
    category: "schedule",
    source: "message",
    lifecycle: "active",
    datetime: pipelineStart.toISOString(),
    confidence: 0.9,
    metadata: {},
    lifecycleUpdatedAt: pipelineTs,
    createdAt: pipelineTs,
    updatedAt: pipelineTs,
  } satisfies EventCandidate,
]);

const pipeline = listTimelineProjectionFromStore({
  opportunityContext: { now: pipelineNow, maxResults: 3 },
  notificationContext: { now: pipelineNow },
  timelineContext: { now: pipelineNow },
});
assert.ok(Array.isArray(pipeline));
assert.ok(pipeline.length >= 1);
assert.equal(pipeline[0]!.section, "Today");
assert.equal(pipeline[0]!.items[0]!.ecId, "ec-pipeline");

resetEventCandidatesForTests([]);
console.log("test-timeline-projection: ok");
