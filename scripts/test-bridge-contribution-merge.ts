#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import type { EventCandidate } from "../lib/events/event-candidate";
import type { ExperienceBridgeContribution } from "../lib/experience-bridge/experience-bridge-types";
import { mergeBridgeContributionsIntoEvent } from "../lib/experience-bridge/merge-bridge-shared-media";

function baseEvent(): EventCandidate {
  return {
    id: "evt-bridge-share",
    title: "제주",
    category: "travel",
    source: "manual",
    lifecycle: "active",
    confidence: 0.9,
    lifecycleUpdatedAt: "2026-06-10T08:00:00.000Z",
    createdAt: "2026-06-10T08:00:00.000Z",
    updatedAt: "2026-06-10T08:00:00.000Z",
    place: "제주",
    metadata: {
      experienceBridgeParticipant: true,
      feedCaptures: [
        {
          id: "cap-host",
          kind: "photo",
          capturedAtIso: "2026-06-10T09:00:00.000Z",
          mediaContextId: "mc-host",
          ownerUserId: "user-host",
        },
      ],
    },
  };
}

const contributions: ExperienceBridgeContribution[] = [
  {
    contributorUserId: "user-friend",
    createdAtIso: "2026-06-10T10:00:00.000Z",
    capture: {
      id: "cap-friend",
      kind: "photo",
      capturedAtIso: "2026-06-10T10:00:00.000Z",
      url: "https://cdn.example.com/friend.jpg",
      authorDisplayName: "지연",
      ownerUserId: "user-friend",
    },
  },
  {
    contributorUserId: "user-host",
    createdAtIso: "2026-06-10T09:30:00.000Z",
    capture: {
      id: "cap-host",
      kind: "photo",
      capturedAtIso: "2026-06-10T09:00:00.000Z",
      url: "https://cdn.example.com/host.jpg",
      ownerUserId: "user-host",
    },
  },
];

const merged = mergeBridgeContributionsIntoEvent({
  event: baseEvent(),
  contributions,
  viewerUserId: "user-host",
});
assert.ok(merged);
const captures = merged!.metadata?.feedCaptures ?? [];
assert.equal(captures.length, 2);
assert.equal(
  captures.find((row) => row.id === "cap-host")?.url,
  "https://cdn.example.com/host.jpg",
);
assert.equal(
  captures.find((row) => row.id === "cap-friend")?.url,
  "https://cdn.example.com/friend.jpg",
);

const inviteeView = mergeBridgeContributionsIntoEvent({
  event: {
    ...baseEvent(),
    metadata: {
      ...baseEvent().metadata,
      feedCaptures: [
        ...(baseEvent().metadata?.feedCaptures as []),
        {
          id: "cap-friend",
          kind: "photo" as const,
          capturedAtIso: "2026-06-10T10:00:00.000Z",
          mediaContextId: "mc-friend",
          ownerUserId: "user-friend",
        },
      ],
    },
  },
  contributions,
  viewerUserId: "user-friend",
});
assert.ok(inviteeView);
assert.equal(inviteeView!.metadata?.feedCaptures?.length, 2);
assert.equal(
  inviteeView!.metadata?.feedCaptures?.find((row) => row.id === "cap-friend")?.url,
  "https://cdn.example.com/friend.jpg",
);

console.log("test-bridge-contribution-merge: ok");
