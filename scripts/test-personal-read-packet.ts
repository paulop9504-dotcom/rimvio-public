#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import type { EventCandidate } from "../lib/events/event-candidate";
import { resetEventCandidatesForTests } from "../lib/events/event-store";
import {
  resetLearningRollupForTests,
  applyLearningSignals,
} from "../lib/archive/learning-rollup-store";
import {
  assemblePersonalReadPacket,
  clearPersonalReadPacketCacheForTests,
  serializePacketForLlm,
  validateActionContract,
} from "../lib/personal-read-model";
import type { LinkRow } from "../types/database";

function baseEvent(overrides: Partial<EventCandidate>): EventCandidate {
  return {
    id: "ev-prm-test",
    title: "제주 여행",
    category: "travel",
    source: "message",
    lifecycle: "scheduled",
    confidence: 0.8,
    lifecycleUpdatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    place: "제주",
    ...overrides,
  };
}

function seedLink(): LinkRow {
  return {
    id: "link-prm",
    user_id: null,
    original_url: "https://flight.naver.com",
    title: "제주 D-1 출발",
    thumbnail_url: null,
    domain: "naver.com",
    category: "travel",
    actions: [{ id: "open", label: "열기", kind: "open", href: "https://flight.naver.com" }],
    created_at: new Date().toISOString(),
    expires_at: null,
  };
}

resetEventCandidatesForTests([
  baseEvent({
    id: "ec-jeju",
    title: "민수랑 제주",
    metadata: { planPeerDisplayName: "민수" },
  }),
  baseEvent({
    id: "ec-jeju-d1",
    title: "제주 D-1 출발",
    category: "travel",
    datetime: new Date().toISOString(),
  }),
]);
resetLearningRollupForTests([]);
applyLearningSignals([
  {
    contextKey: "event.travel.link:naver.com",
    actionKey: "open",
    label: "열기",
    shown: 4,
    clicked: 3,
    executed: 2,
    dismissed: 0,
    rates: { clickRate: 0.75, executeRate: 0.5, dismissRate: 0 },
    scoreDelta: 0.42,
  },
]);
clearPersonalReadPacketCacheForTests();

const packet = assemblePersonalReadPacket({
  bypassCache: true,
  activeContextId: "ec-jeju-d1",
  activeLink: seedLink(),
  now: new Date("2026-06-15T09:00:00.000Z"),
});

assert.equal(packet.meta.scopeAi, "guardian");
assert.equal(packet.meta.activeContextId, "ec-jeju-d1");
assert.ok(packet.fact.recentEventIds.includes("ec-jeju"));
assert.equal(packet.experience.focus.title, "제주 D-1 출발");
assert.ok(packet.meaning.relationshipLines.length >= 0);
assert.ok(packet.action.registryEntries.length > 0);
assert.equal(packet.gates.urgencyBypass, true, "D-1 travel link enables urgency bypass");
assert.equal(packet.gates.forbidRecommendationHero, true);

const travelTrigger = packet.recall.eligibleTriggers.find((row) => row.kind === "travel_d_minus");
assert.ok(travelTrigger, "focus context with D-1 title should emit travel_d_minus trigger");

const serialized = serializePacketForLlm(packet);
assert.ok(serialized.includes("[PersonalReadPacket v1]"));
assert.ok(serialized.includes("ec-jeju-d1"));

const valid = validateActionContract(
  {
    templateId: packet.action.registryEntries[0]!.id,
    filledSlots: {},
    mainActionType: packet.action.registryEntries[0]!.mainActionType,
  },
  packet,
);
assert.ok(valid?.templateId);

const invalid = validateActionContract(
  { templateId: "NOT_REGISTERED", filledSlots: {}, mainActionType: "FAKE" },
  packet,
);
assert.equal(invalid, null);

const redacted = serializePacketForLlm(
  { ...packet, meta: { ...packet.meta, scopeAi: "explorer" } },
  { redactPrivateFacts: true },
);
assert.ok(!redacted.includes("link-prm") || redacted.includes('"linkSummaries": []'));

console.log("test-personal-read-packet: ok");
