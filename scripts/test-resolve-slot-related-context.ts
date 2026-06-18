#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import type { EventCandidate } from "../lib/events/event-candidate";
import type { FeedTodaySlot } from "../lib/feed/feed-today-slot-types";
import {
  deriveExperienceContextLabels,
  derivePeopleContextLabels,
  deriveRelatedContextLabels,
  resolveSlotRelatedContextBundle,
} from "../lib/feed/resolve-slot-related-context";
import { indexEventsById } from "../lib/plan-context/project-plan-to-feed-slot";

const jeju: EventCandidate = {
  id: "evt-jeju",
  title: "제주 여행",
  category: "travel",
  source: "chat",
  lifecycle: "active",
  datetime: "2026-06-01T10:00:00.000Z",
  place: "제주",
  confidence: 0.9,
  metadata: {
    feedPlanEnabled: true,
    planPeerDisplayName: "민수",
    planWindowEndIso: "2026-06-03T10:00:00.000Z",
  },
  lifecycleUpdatedAt: "2026-06-01T10:00:00.000Z",
  createdAt: "2026-06-01T10:00:00.000Z",
  updatedAt: "2026-06-01T10:00:00.000Z",
};

const jeju2: EventCandidate = {
  ...jeju,
  id: "evt-jeju-2",
  datetime: "2025-06-01T10:00:00.000Z",
  metadata: {
    ...jeju.metadata,
    planPeerDisplayName: "민수",
  },
};

const labels = deriveRelatedContextLabels({
  plan: {
    planId: "evt-jeju",
    title: "제주 여행",
    windowStartIso: jeju.datetime!,
    windowEndIso: "2026-06-03T10:00:00.000Z",
    windowConfidence: "confirmed",
    place: "제주",
    peerDisplayName: "민수",
    peerThreadId: "peer-minsu",
    attachMode: "new",
    planMode: "group",
  },
  peers: [{ displayName: "민수" }],
  slotType: "travel",
});

assert.deepEqual(labels, ["민수", "제주", "여행"]);

const peopleLabels = derivePeopleContextLabels({
  plan: {
    planId: "evt-jeju",
    title: "제주 여행",
    windowStartIso: jeju.datetime!,
    windowEndIso: "2026-06-03T10:00:00.000Z",
    windowConfidence: "confirmed",
    place: "제주",
    peerDisplayName: "민수",
    peerThreadId: "peer-minsu",
    attachMode: "new",
    planMode: "group",
  },
  peers: [{ displayName: "민수" }],
});
assert.deepEqual(peopleLabels, ["민수"]);

const experienceLabels = deriveExperienceContextLabels({
  plan: {
    planId: "evt-jeju",
    title: "제주 여행",
    windowStartIso: jeju.datetime!,
    windowEndIso: "2026-06-03T10:00:00.000Z",
    windowConfidence: "confirmed",
    place: "제주",
    peerDisplayName: "민수",
    peerThreadId: "peer-minsu",
    attachMode: "new",
    planMode: "group",
  },
  place: "제주",
  slotType: "travel",
});
assert.deepEqual(experienceLabels, ["제주", "여행"]);

const slot: FeedTodaySlot = {
  kind: "calendar",
  id: "slot-1",
  slotType: "travel",
  row: {
    id: "row-1",
    event: {
      eventId: "evt-jeju",
      title: "제주 여행",
      startMs: Date.parse(jeju.datetime!),
    },
    prompt_hint: null,
    context_lines: null,
    overlayActions: [],
  },
};

const eventsById = indexEventsById([jeju, jeju2]);
const bundle = resolveSlotRelatedContextBundle({
  slot,
  events: [jeju, jeju2],
  eventsById,
  peerLookup: { peers: [], messages: [] },
});

assert.ok(bundle);
assert.match(bundle!.summaryLine, /민수/u);
assert.equal(bundle!.people.related.length, 1);
assert.equal(bundle!.experience.related.length, 1);
assert.equal(bundle!.people.related[0]!.eventId, "evt-jeju-2");

console.log("✓ resolve-slot-related-context");
