import assert from "node:assert/strict";
import { buildLodgingDynamicTags, inferLodgingContextMode } from "@/lib/globe/lodging";
import type { EventCandidate } from "@/lib/events/event-candidate";

function seedEvent(partial: Partial<EventCandidate> & Pick<EventCandidate, "id">): EventCandidate {
  const stamp = "2026-06-15T08:00:00.000Z";
  return {
    id: partial.id,
    title: partial.title ?? "여행",
    category: partial.category ?? "travel",
    source: partial.source ?? "manual",
    lifecycle: partial.lifecycle ?? "planned",
    datetime: partial.datetime ?? stamp,
    place: partial.place ?? null,
    description: partial.description ?? "",
    metadata: partial.metadata ?? {},
    confidence: partial.confidence ?? 0.9,
    lifecycleUpdatedAt: stamp,
    createdAt: stamp,
    updatedAt: stamp,
  };
}

function run() {
  const business = seedEvent({
    id: "biz-trip",
    title: "도쿄 출장",
    place: "도쿄",
    datetime: "2026-06-15T00:00:00.000Z",
    metadata: {
      feedPlanEnabled: true,
      globePlaceLat: 35.6762,
      globePlaceLng: 139.6503,
    },
  });
  assert.equal(inferLodgingContextMode(business), "business_trip");

  const morningMeeting = buildLodgingDynamicTags({
    event: business,
    lodgingLat: 35.68,
    lodgingLng: 139.64,
    userLat: 37.5665,
    userLng: 126.978,
    now: new Date("2026-06-15T07:45:00.000+09:00"),
  });
  assert.ok(morningMeeting.contextLine?.includes("체크아웃"), morningMeeting.contextLine ?? "");
  assert.ok(morningMeeting.chips.some((chip) => chip.label.includes("거점")), morningMeeting.chips);

  const commute = buildLodgingDynamicTags({
    event: business,
    lodgingLat: 35.677,
    lodgingLng: 139.651,
    userLat: 35.676,
    userLng: 139.649,
    now: new Date("2026-06-14T18:00:00.000+09:00"),
  });
  assert.ok(commute.chips.some((chip) => chip.label.startsWith("도보")), commute.chips);
  assert.ok(commute.chips.some((chip) => chip.label.includes("택시")), commute.chips);

  const themePark = seedEvent({
    id: "disney",
    title: "디즈니랜드",
    place: "치바",
    metadata: { executionProfileId: "theme_park_day", globePlaceLat: 35.6329, globePlaceLng: 139.8804 },
  });
  assert.equal(inferLodgingContextMode(themePark), "theme_park_day");
  const parkTags = buildLodgingDynamicTags({
    event: themePark,
    lodgingLat: 35.63,
    lodgingLng: 139.88,
    now: new Date("2026-06-15T10:00:00.000Z"),
  });
  assert.ok(parkTags.contextLine?.includes("입구"), parkTags.contextLine ?? "");

  const hotDay = buildLodgingDynamicTags({
    event: seedEvent({ id: "leisure", title: "오사카 여행", place: "오사카" }),
    lodgingLat: 34.6937,
    lodgingLng: 135.5023,
    tempC: 32,
    now: new Date("2026-06-15T12:00:00.000Z"),
  });
  assert.ok(hotDay.contextLine?.includes("32"), hotDay.contextLine ?? "");

  console.log("test-lodging-dynamic-tags: ok");
}

run();
