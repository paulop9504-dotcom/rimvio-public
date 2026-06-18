#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { canReadBridgeExperience } from "../lib/experience-bridge/bridge-access";
import { resolveBridgePublishRole } from "../lib/experience-bridge/ensure-bridge-link-before-publish";
import { resolveBridgeContributionsForSync } from "../lib/experience-bridge/resolve-bridge-contributions-for-sync";
import { isUsableBridgeMediaUrl } from "../lib/experience-bridge/bridge-media-url";
import { resetClientFetchCacheForTests } from "../lib/http/client-fetch-cache";

assert.equal(
  resolveBridgePublishRole({ viewerUserId: "host-1", hostUserId: "host-1" }),
  "host",
);
assert.equal(
  resolveBridgePublishRole({ viewerUserId: "friend-1", hostUserId: "host-1" }),
  "participant",
);

assert.ok(
  canReadBridgeExperience({
    viewerUserId: "friend-1",
    participants: [
      {
        userId: "host-1",
        displayName: "호스트",
        status: "accepted",
        role: "host",
        invitedAtIso: "2026-01-01T00:00:00.000Z",
        joinedAtIso: "2026-01-01T00:00:00.000Z",
      },
      {
        userId: "friend-1",
        displayName: "친구",
        status: "accepted",
        role: "member",
        invitedAtIso: "2026-01-02T00:00:00.000Z",
        joinedAtIso: "2026-01-02T00:00:00.000Z",
      },
    ],
  }),
);
assert.ok(
  !canReadBridgeExperience({
    viewerUserId: "stranger",
    participants: [
      {
        userId: "host-1",
        displayName: "호스트",
        status: "accepted",
        role: "host",
        invitedAtIso: "2026-01-01T00:00:00.000Z",
        joinedAtIso: "2026-01-01T00:00:00.000Z",
      },
    ],
  }),
);

assert.ok(
  isUsableBridgeMediaUrl(
    "https://x.test/storage/v1/object/public/experience-bridge/u/bridge/e/c.jpg",
  ),
);
assert.ok(
  !isUsableBridgeMediaUrl(
    "https://x.test/storage/v1/object/public/peer-chat/u/bridge/e/c.jpg",
  ),
);

const fromPlan = [
  {
    contributorUserId: "u1",
    createdAtIso: "2026-01-01T00:00:00.000Z",
    capture: {
      id: "c1",
      kind: "photo" as const,
      capturedAtIso: "2026-01-01T00:00:00.000Z",
      url: "https://cdn.example.com/a.jpg",
    },
  },
];
assert.equal(
  resolveBridgeContributionsForSync({ fromPlan, fromDedicated: [] }).length,
  1,
);
assert.equal(
  resolveBridgeContributionsForSync({
    fromPlan: [],
    fromDedicated: fromPlan,
  }).length,
  1,
);

resetClientFetchCacheForTests();

console.log("test-bridge-media-share: ok");
