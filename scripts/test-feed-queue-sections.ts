#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  buildFeedContextActionRows,
  countFeedQueueRows,
  flattenFeedQueueSections,
  isFeedQueueInProgress,
  resolveFeedQueueSections,
} from "../lib/feed/resolve-feed-queue-sections";
import type { RankedSurface } from "../lib/surface-engine/surface-contract";
import type { SurfaceNode } from "../lib/surface-composition/surface-node-contract";

function mockSurface(
  id: string,
  lifecycle: RankedSurface["lifecycle"],
  title: string,
): RankedSurface {
  return {
    id,
    type: "schedule",
    title,
    description: "",
    primaryAction: {
      id: `${id}:primary`,
      kind: "primary",
      label: "확인",
      capabilityId: "CALENDAR",
    },
    secondaryActions: [],
    people: [],
    resources: [],
    events: [],
    narration: null,
    visibility: "normal",
    lifecycle,
    channel: "FEED",
    priority: { band: "medium", surfacePriorityScore: 10 },
  } as RankedSurface;
}

const primary = {
  id: "primary-1",
  type: "schedule",
  title: "저녁 약속",
  description: "",
  primaryAction: {
    id: "p1",
    kind: "primary",
    label: "길찾기",
    capabilityId: "NAVIGATE",
  },
  secondaryActions: [
    { id: "s1", kind: "secondary", label: "캘린더", capabilityId: "CALENDAR" },
    { id: "s2", kind: "secondary", label: "공유", capabilityId: "SHARE" },
    { id: "s3", kind: "secondary", label: "메모", capabilityId: "NOTE" },
    { id: "s4", kind: "secondary", label: "연락", capabilityId: "CONTACT" },
  ],
  people: [],
  resources: [],
  events: [],
  narration: null,
  priority: { band: "high", surfacePriorityScore: 90 },
  visibility: "prominent",
  lifecycle: "in_progress",
  channel: "FEED",
  layoutSlot: "primary",
  mfeId: "ScheduleSurfaceMF",
  capabilityBindings: { primary: "NAVIGATE", secondary: ["CALENDAR", "SHARE", "NOTE", "CONTACT"] },
  uiComponents: [],
} as SurfaceNode;

assert.equal(isFeedQueueInProgress(mockSurface("a", "in_progress", "A")), true);
assert.equal(isFeedQueueInProgress(mockSurface("b", "draft", "B")), false);

const contextRows = buildFeedContextActionRows(primary);
assert.equal(contextRows.length, 1);
assert.equal(contextRows[0]?.title, "연락");

const latent = [
  mockSurface("latent-1", "in_progress", "이동 중"),
  mockSurface("latent-2", "draft", "내일 회의"),
];

const sections = resolveFeedQueueSections(primary, latent);
assert.deepEqual(
  sections.map((section) => section.id),
  ["in_progress", "context_actions", "up_next"],
);
assert.equal(sections[0]?.rows.length, 2);
assert.equal(sections[0]?.rows[0]?.title, "저녁 약속");
assert.equal(sections[1]?.rows.length, 1);
assert.equal(sections[2]?.rows.length, 1);

const flat = flattenFeedQueueSections(sections);
assert.equal(flat.length, 4);
assert.equal(countFeedQueueRows(sections), 4);

console.log("test-feed-queue-sections: ok");
