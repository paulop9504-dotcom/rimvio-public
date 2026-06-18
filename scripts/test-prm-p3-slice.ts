#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import type { EventCandidate } from "../lib/events/event-candidate";
import { resetEventCandidatesForTests } from "../lib/events/event-store";
import {
  assemblePersonalReadPacket,
  clearPersonalReadPacketCacheForTests,
  redactPacketForExplorer,
  serializePacketForLlm,
} from "../lib/personal-read-model";
import { buildPersonalReadContextBlock } from "../lib/personal-read-model/build-personal-read-context-block";
import { looksLikeContextSearch } from "../lib/search/classify-search-composer-intent";

function baseEvent(overrides: Partial<EventCandidate>): EventCandidate {
  return {
    id: "ev-p3",
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

resetEventCandidatesForTests([
  baseEvent({
    id: "ec-jeju-peer",
    title: "민수랑 제주",
    metadata: { planPeerDisplayName: "민수" },
  }),
]);
clearPersonalReadPacketCacheForTests();

const packet = assemblePersonalReadPacket({
  bypassCache: true,
  activeContextId: "ec-jeju-peer",
  now: new Date("2026-06-15T09:00:00.000Z"),
});

assert.ok(packet.meaning.relationshipLines.length >= 0);
assert.ok(packet.experience.focus.title);

const redacted = redactPacketForExplorer(packet);
assert.equal(redacted.experience.focus.title, null);
assert.equal(redacted.experience.focus.place, null);
assert.equal(redacted.meaning.relationshipLines.length, 0);
assert.equal(redacted.recall.eligibleTriggers.length, 0);
assert.deepEqual(
  redacted.experience.hubLinks.map((row) => row.actionUrl),
  packet.experience.hubLinks.map(() => null),
);

const serializedExplorer = serializePacketForLlm(
  { ...packet, meta: { ...packet.meta, scopeAi: "explorer" } },
  { redactPrivateFacts: true },
);
assert.ok(!serializedExplorer.includes("민수랑"));
assert.ok(serializedExplorer.includes('"relationshipLines": []'));

const externalBlock = buildPersonalReadContextBlock({
  activeContextId: "ec-jeju-peer",
  pinScope: "external",
});
assert.ok(externalBlock.includes("[PersonalReadPacket v1]"));
assert.ok(!externalBlock.includes("민수랑"));

assert.equal(looksLikeContextSearch("제주 카페 추천"), false);
assert.equal(looksLikeContextSearch("작년 제주 갔던"), true);

console.log("test-prm-p3-slice: ok");
