#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import type { EventCandidate } from "../lib/events/event-candidate";
import { resetEventCandidatesForTests } from "../lib/events/event-store";
import { buildGlobalBrainContextBlock } from "../lib/global-brain/build-context-injection-block";
import { buildCommerceAwareRankingContextKey } from "../lib/feed/build-commerce-aware-ranking-context-key";
import { buildContextHubAiSearchHandoff } from "../lib/globe/context-hub/build-context-hub-ai-search-handoff";
import { listContextHubServicesForEvent } from "../lib/globe/context-hub/context-hub-service-catalog";
import { buildPersonalReadContextBlock } from "../lib/personal-read-model/build-personal-read-context-block";
import { createOpenAction } from "../lib/enrichers/action-factory";
import type { GlobalBrainSnapshot } from "../lib/global-brain/types";

function baseEvent(overrides: Partial<EventCandidate>): EventCandidate {
  return {
    id: "ec-prm-p1",
    title: "민수랑 제주",
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

resetEventCandidatesForTests([baseEvent({ id: "ec-prm-p1" })]);

const handoff = buildContextHubAiSearchHandoff(baseEvent({ id: "ec-prm-p1" }));
assert.ok(handoff.href.includes("contextEventId=ec-prm-p1"));
assert.ok(handoff.href.startsWith("/search?"));
assert.match(handoff.searchQuery, /제주/u);

const services = listContextHubServicesForEvent(baseEvent({ id: "ec-prm-p1" }));
const aiSearch = services?.services.find((row) => row.serviceId === "ai_search");
assert.ok(aiSearch?.implemented);
assert.ok(aiSearch?.connected);
assert.equal(aiSearch?.handoffHref, handoff.href);

const compareKey = buildCommerceAwareRankingContextKey({
  link: {
    domain: "coupang.com",
    category: "shopping",
    source_type: "commerce",
  },
  action: createOpenAction({
    label: "가격 비교",
    href: "https://example.com",
    payload: { marketPack: { market: "kr_shopping", lane: "compare", destination: "coupang" } },
  }),
});
assert.ok(compareKey.includes("::compare::kr_shopping"));

const prmBlock = buildPersonalReadContextBlock({
  scope: "client",
  activeContextId: "ec-prm-p1",
});
assert.ok(prmBlock?.includes("[PersonalReadPacket v1]"));
assert.ok(prmBlock?.includes("ec-prm-p1"));

const snapshot: GlobalBrainSnapshot = {
  currentDateTime: new Date().toISOString(),
  referenceDate: "2026-06-15",
  todaySchedule: [],
  remainingSchedule: [],
  sentinelTasks: [],
  userGoals: [],
  userStatus: null,
  recentStateMessages: [],
  eventHorizon: [],
  resolvedTemporal: null,
  userLocation: null,
  preferences: [],
  nexusContacts: [],
  scheduleListBatch: null,
  actionEvents: [],
};

const brainBlock = buildGlobalBrainContextBlock({
  snapshot,
  shouldEnrich: true,
  personalReadBlock: prmBlock,
});
assert.ok(brainBlock.includes("[PersonalReadPacket v1]"));

console.log("test-prm-p1-slice: ok");
