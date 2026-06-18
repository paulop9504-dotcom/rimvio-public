import assert from "node:assert/strict";
import { applyLodgingMarkerFocusPresentation } from "@/lib/globe/context-hub/apply-lodging-marker-focus-presentation";
import { resolveLodgingSituationalLabel } from "@/lib/globe/context-hub/resolve-lodging-situational-label";
import type { GlobeLodgingMapMarker } from "@/lib/globe/context-hub/lodging-globe-marker-types";
import {
  inferGlobePinDisplayDecision,
  projectGlobePinDisplayMode,
} from "@/lib/globe/project-globe-pin-display-mode";
import type { ClassifiedGlobePin } from "@/lib/feed/experience-globe-ping-types";
import type { EventCandidate } from "@/lib/events/event-candidate";

function seedEvent(partial: Partial<EventCandidate> & Pick<EventCandidate, "id">): EventCandidate {
  const stamp = "2026-06-15T08:00:00.000Z";
  return {
    id: partial.id,
    title: partial.title ?? "여행",
    category: partial.category ?? "travel",
    source: partial.source ?? "manual",
    lifecycle: partial.lifecycle ?? "scheduled",
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

function seedPin(partial: Partial<ClassifiedGlobePin> & Pick<ClassifiedGlobePin, "id">): ClassifiedGlobePin {
  return {
    id: partial.id,
    kind: partial.kind ?? "place",
    label: partial.label ?? "맥락",
    lat: partial.lat ?? 35.6762,
    lng: partial.lng ?? 139.6503,
    pinX: partial.pinX ?? 50,
    pinY: partial.pinY ?? 50,
    sourceEventId: partial.sourceEventId ?? "evt",
    pinShape: partial.pinShape ?? "slot",
    slot: partial.slot ?? {
      experienceTitle: partial.label ?? "맥락",
      photoCount: 0,
      videoCount: 0,
    },
  };
}

function seedLodgingMarker(
  partial: Partial<GlobeLodgingMapMarker> & Pick<GlobeLodgingMapMarker, "resourceId">,
): GlobeLodgingMapMarker {
  return {
    markerKind: "lodging",
    id: `lodging:${partial.resourceId}`,
    resourceId: partial.resourceId,
    label: partial.label ?? "도쿄 게스트하우스",
    lat: partial.lat ?? 35.68,
    lng: partial.lng ?? 139.64,
    carouselIndex: partial.carouselIndex ?? 0,
    isMain: partial.isMain ?? false,
    thumbnailUrl: partial.thumbnailUrl ?? "https://example.com/a.jpg",
  };
}

function run() {
  const nowMs = new Date("2026-06-15T10:00:00.000Z").getTime();
  const travel = seedEvent({
    id: "tokyo-trip",
    title: "도쿄 여행",
    place: "도쿄",
    metadata: { feedPlanEnabled: true },
  });
  assert.equal(resolveLodgingSituationalLabel(travel), "여행중 · 숙소");

  const business = seedEvent({ id: "biz", title: "도쿄 출장", place: "도쿄" });
  assert.equal(resolveLodgingSituationalLabel(business), "출장 · 숙소");

  const markers = [
    seedLodgingMarker({ resourceId: "a", label: "도쿄 게스트하우스", isMain: true }),
    seedLodgingMarker({ resourceId: "b", label: "도쿄 스테이", lat: 35.681, lng: 139.645 }),
  ];
  const grouped = applyLodgingMarkerFocusPresentation({
    markers,
    focusStageOpen: true,
    situationalLabel: "여행중 · 숙소",
    activeResourceId: "a",
  });
  assert.equal(grouped.length, 1);
  assert.equal(grouped[0]?.displayVariant, "situational_label");
  assert.equal(grouped[0]?.label, "여행중 · 숙소");
  assert.equal(grouped[0]?.thumbnailUrl, null);

  const recent = seedEvent({ id: "recent", title: "도쿄", datetime: "2026-06-14T08:00:00.000Z" });
  const old = seedEvent({
    id: "old",
    title: "지난 여행",
    datetime: "2025-01-01T08:00:00.000Z",
    lifecycle: "completed",
  });
  const eventsById = new Map<string, EventCandidate>([
    ["recent", recent],
    ["old", old],
  ]);
  const pins = [
    seedPin({ id: "p-recent", sourceEventId: "recent", label: "도쿄" }),
    seedPin({ id: "p-old", sourceEventId: "old", label: "지난 여행" }),
  ];

  assert.equal(
    inferGlobePinDisplayDecision({
      pin: pins[1]!,
      event: old,
      focusedEventId: null,
      expandedPinId: null,
      lodgingFocusStageOpen: false,
      viewerLat: null,
      viewerLng: null,
      nowMs,
    }).reason,
    "stale_completed",
  );

  assert.equal(
    inferGlobePinDisplayDecision({
      pin: pins[0]!,
      event: recent,
      focusedEventId: null,
      expandedPinId: "p-recent",
      lodgingFocusStageOpen: false,
      viewerLat: null,
      viewerLng: null,
      nowMs,
    }).shape,
    "slot",
  );
  assert.equal(
    inferGlobePinDisplayDecision({
      pin: pins[0]!,
      event: recent,
      focusedEventId: "recent",
      expandedPinId: null,
      lodgingFocusStageOpen: false,
      viewerLat: null,
      viewerLng: null,
      nowMs,
    }).reason,
    "focused_context",
  );

  const projected = projectGlobePinDisplayMode({
    pins,
    eventsById,
    now: new Date(nowMs),
  });
  assert.equal(projected.find((row) => row.id === "p-old")?.pinShape, "dot");
  assert.equal(projected.find((row) => row.id === "p-recent")?.pinShape, "slot");

  const expanded = projectGlobePinDisplayMode({
    pins,
    eventsById,
    expandedPinId: "p-old",
    now: new Date(nowMs),
  });
  assert.equal(expanded.find((row) => row.id === "p-old")?.pinShape, "slot");

  const lodgingOpen = projectGlobePinDisplayMode({
    pins,
    eventsById,
    lodgingFocusStageOpen: true,
    focusedEventId: "recent",
    now: new Date(nowMs),
  });
  assert.ok(lodgingOpen.every((row) => row.pinShape === "dot"));

  console.log("test-globe-pin-display-mode: ok");
}

run();
