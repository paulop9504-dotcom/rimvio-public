#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { compilePlaceDiscovery } from "../lib/context-resolver/discovery/compile-place-discovery";
import type { PlaceDiscoveryContext } from "../lib/context-resolver/places/types";

const context: PlaceDiscoveryContext = {
  criteria: {
    intent: "FIND_PLACE",
    query: "서울역 스테이크",
    category: "restaurant",
    cuisine_keyword: "스테이크",
    vibe: "unknown",
    only_open_now: false,
    min_rating: 0,
    max_results: 2,
    radius_m: 3000,
  },
  preference: { quiet_affinity: 0, visited_places: [], shadow_hint: null },
  candidates: [
    {
      place_id: "p1",
      name: "미도인 그랜드센트럴",
      address: "서울 중구",
      lat: 37.55,
      lng: 126.97,
      rating: 0,
      open_now: true,
      vibes: ["unknown"],
      phone: "02-000-0000",
      maps_url: "https://map.naver.com/p/search/test",
      thumbnail_url: "https://search.pstatic.net/example.jpg",
      photo_urls: [
        "https://search.pstatic.net/example.jpg",
        "https://search.pstatic.net/example-2.jpg",
      ],
      photo_urls: [
        "https://search.pstatic.net/example.jpg",
        "https://search.pstatic.net/example-2.jpg",
      ],
      naver_category: "음식점>양식",
      reason: "지금 영업 중",
      travel_minutes: 5,
      arrive_at_clock: "12:05",
      shadow_match: false,
    },
  ],
};

const { wire } = compilePlaceDiscovery(context, {
  categoryLabel: "스테이크",
  anchor: "서울역",
});

assert.equal(wire.options[0]?.thumbnail_url, "https://search.pstatic.net/example.jpg");
assert.equal(wire.options[0]?.photo_urls.length, 2);
assert.match(wire.options[0]?.category ?? "", /양식/);
assert.ok(wire.options[0]?.action_buttons.length >= 2);

console.log("test-place-discovery-cards-wire: ok");
