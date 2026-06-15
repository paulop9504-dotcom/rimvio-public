#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import type { EventCandidate } from "../lib/events/event-candidate";
import { buildSearchableExperienceIndex } from "../lib/search/build-searchable-experience-index";
import { searchRelatedContext } from "../lib/search/search-related-context";
import { searchRelatedContextByAxes } from "../lib/search/search-related-context-by-axis";
import { splitContextSearchQuery } from "../lib/search/split-context-search-query";
import { classifySearchComposerIntent } from "../lib/search/classify-search-composer-intent";

const jejuEvent: EventCandidate = {
  id: "evt-jeju-minsu",
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
    feedCaptures: [
      {
        id: "cap-1",
        kind: "photo",
        capturedAtIso: "2026-06-02T11:00:00.000Z",
        placeLabel: "흑돼지집",
      },
    ],
  },
  lifecycleUpdatedAt: "2026-06-01T10:00:00.000Z",
  createdAt: "2026-06-01T10:00:00.000Z",
  updatedAt: "2026-06-02T11:00:00.000Z",
};

const index = buildSearchableExperienceIndex([jejuEvent]);
assert.ok(index.length >= 1);
assert.match(index[0]!.headline, /민수/u);

const hits = searchRelatedContext(index, "민수 제주");
assert.equal(hits.length, 1);
assert.equal(hits[0]!.eventId, "evt-jeju-minsu");

assert.equal(classifySearchComposerIntent("민수 제주"), "context_search");
assert.equal(classifySearchComposerIntent("제주 추억"), "context_search");
assert.equal(classifySearchComposerIntent("7시 강남 약속"), "capture");
assert.equal(classifySearchComposerIntent("제주 3박 여행 일정 메모"), "capture");

assert.deepEqual(splitContextSearchQuery("민수 제주").peopleTerms, ["민수"]);
assert.deepEqual(splitContextSearchQuery("민수 제주").experienceTerms, ["제주"]);

const axes = searchRelatedContextByAxes(index, "민수 제주");
assert.equal(axes.people.hits.length, 1);
assert.equal(axes.experience.hits.length, 1);

console.log("✓ search-related-context");
