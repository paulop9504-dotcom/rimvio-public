#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  composeExperienceTypePrepLine,
  experienceEventTypeById,
  EXPERIENCE_EVENT_TYPE_SPECS,
  formatExperienceLensChip,
  formatExperienceTypeChip,
  resolveExperienceEventType,
  resolveExperienceLens,
} from "../lib/experience-graph";
import type { EventCandidate } from "../lib/events/event-candidate";
import { resolveFeedSlotTypePrepLine } from "../lib/feed/resolve-feed-slot-type-prep-line";
import { resolveFeedSlotWeatherTarget } from "../lib/feed/resolve-feed-slot-weather-target";
import type { FeedTodaySlot } from "../lib/feed/feed-today-slot-types";

function baseEvent(overrides: Partial<EventCandidate>): EventCandidate {
  return {
    id: "ev-test",
    title: "테스트",
    category: "schedule",
    source: "message",
    lifecycle: "scheduled",
    confidence: 0.8,
    lifecycleUpdatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

assert.equal(EXPERIENCE_EVENT_TYPE_SPECS.length, 9);

assert.equal(resolveExperienceEventType(baseEvent({ category: "travel", title: "제주" })), "travel");
assert.equal(
  resolveExperienceEventType(baseEvent({ category: "schedule", title: "아이유 콘서트" })),
  "concert",
);
assert.equal(
  resolveExperienceEventType(baseEvent({ category: "schedule", title: "한라산 등산" })),
  "sport",
);
assert.equal(
  resolveExperienceEventType(baseEvent({ category: "social", title: "저녁 약속" })),
  "date",
);
assert.equal(
  resolveExperienceEventType(baseEvent({ category: "food", title: "파스타" })),
  "food",
);

const soonStart = new Date(Date.now() + 5 * 3_600_000).toISOString();
assert.equal(
  resolveExperienceLens({ startIso: soonStart, endIso: null }),
  "soon",
);

const pastEnd = new Date(Date.now() - 6 * 3_600_000).toISOString();
const pastStart = new Date(Date.now() - 10 * 3_600_000).toISOString();
assert.equal(
  resolveExperienceLens({ startIso: pastStart, endIso: pastEnd }),
  "then",
);

const concertPrep = composeExperienceTypePrepLine({
  eventType: "concert",
  lens: "soon",
  peerDisplayName: "민수",
  hoursUntil: 5,
});
assert.match(concertPrep ?? "", /티켓/);

const travelSpec = experienceEventTypeById("travel");
assert.equal(travelSpec.prep.weather, true);
assert.equal(experienceEventTypeById("concert").prep.weather, false);

const typeChip = formatExperienceTypeChip("sport");
assert.equal(typeChip.label, "운동");
assert.equal(typeChip.emoji, "🏃");

const lensChip = formatExperienceLensChip({ eventType: "date", lens: "then" });
assert.match(lensChip.label, /낭만/);

const concertEvent = baseEvent({
  id: "ev-concert",
  title: "뮤지컬 관람",
  category: "schedule",
  datetime: soonStart,
  place: "예술의전당",
});

const eventsById = new Map([[concertEvent.id, concertEvent]]);
const slot: FeedTodaySlot = {
  kind: "calendar",
  row: {
    id: "row-1",
    event: {
      eventId: concertEvent.id,
      title: concertEvent.title,
      startAt: soonStart,
      startMs: Date.parse(soonStart),
      category: concertEvent.category,
    },
    overlayActions: [],
  },
  slotType: "schedule",
  sortMs: Date.parse(soonStart),
};

assert.equal(resolveFeedSlotWeatherTarget(slot, eventsById), null);

const typePrep = resolveFeedSlotTypePrepLine(slot, eventsById);
assert.ok(typePrep);
assert.match(typePrep!, /티켓|입장/);

console.log("test-experience-event-type: ok");
