import assert from "node:assert/strict";
import { shouldEnrichGlobePhotoPlace } from "@/lib/globe/enrich-globe-photo-place-after-ingest";
import { isCoordsPlaceLabel } from "@/lib/globe/is-coords-place-label";
import { pickBestPhotoPlaceSuggest } from "@/lib/globe/pick-best-photo-place-suggest";
import type { LocateActionResult } from "@/lib/locate/types";

assert.equal(isCoordsPlaceLabel("37.5665°, 126.9780°"), true);
assert.equal(isCoordsPlaceLabel("강남역"), false);
assert.equal(isCoordsPlaceLabel(null), false);

assert.equal(
  shouldEnrichGlobePhotoPlace({
    context: {
      mediaKind: "photo",
      lat: 37.5,
      lng: 127.0,
      placeLabel: "37.5665°, 126.9780°",
    },
  }),
  true,
);

assert.equal(
  shouldEnrichGlobePhotoPlace({
    context: {
      mediaKind: "photo",
      lat: 37.5,
      lng: 127.0,
      placeLabel: "이미 아는 카페",
    },
  }),
  false,
);

assert.equal(
  shouldEnrichGlobePhotoPlace({
    context: {
      mediaKind: "video",
      lat: 37.5,
      lng: 127.0,
      placeLabel: "37.5665°, 126.9780°",
    },
  }),
  false,
);

const nearby = {
  placeName: "떡반집 강남점",
  lat: 37.501,
  lng: 127.001,
  googlePlaceId: "abc",
  distanceM: 42,
};

const vision = {
  place_name: "떡반집",
  lat: 37.501,
  lng: 127.001,
  formatted_address: null,
  cached: false,
  context_signal: "food",
  primary_action: { label: "a", href: "b", copyText: "c" },
  secondary_actions: [],
} satisfies LocateActionResult;

const merged = pickBestPhotoPlaceSuggest({
  nearby,
  vision,
  captureLat: 37.5,
  captureLng: 127.0,
});
assert.equal(merged?.placeName, "떡반집 강남점");
assert.equal(merged?.source, "vision_nearby_merge");

const visionOnly = pickBestPhotoPlaceSuggest({
  nearby: null,
  vision,
  captureLat: 37.5,
  captureLng: 127.0,
});
assert.equal(visionOnly?.source, "vision_locate");

const nearbyOnly = pickBestPhotoPlaceSuggest({
  nearby,
  vision: null,
  captureLat: 37.5,
  captureLng: 127.0,
});
assert.equal(nearbyOnly?.source, "nearby_eatery");

console.log("test-globe-photo-place-suggest: ok");
