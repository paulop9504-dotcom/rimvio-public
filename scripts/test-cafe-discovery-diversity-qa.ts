#!/usr/bin/env npx tsx
/**
 * QA — cafe discovery must not return all 성심당 branches (filter unit + compile path).
 */
import assert from "node:assert/strict";
import { compilePlaceDiscovery } from "../lib/context-resolver/discovery/compile-place-discovery";
import {
  assertCafeDiscoveryDiversity,
  filterCafeCandidates,
} from "../lib/context-resolver/places/filter-cafe-candidates";
import { enrichPlaceCandidates } from "../lib/context-resolver/places/rank-place-candidates";
import type { PlaceCandidate } from "../lib/context-resolver/places/types";

function mockPlace(name: string, category: string): PlaceCandidate {
  return {
    place_id: name,
    name,
    address: "대전 중구",
    lat: 36.33,
    lng: 127.43,
    rating: 4.5,
    open_now: true,
    vibes: ["unknown"],
    phone: null,
    maps_url: null,
    naver_category: category,
  };
}

const naverLikeFlood = [
  mockPlace("성심당 본점", "음식점>카페,디저트>베이커리"),
  mockPlace("성심당 DCC점", "음식점>카페,디저트>베이커리"),
  mockPlace("성심당 대전역점", "음식점>카페,디저트>베이커리"),
  mockPlace("성심당 롯데백화점 대전점", "음식점>카페,디저트>베이커리"),
  mockPlace("성심당 케이크부띠끄", "음식점>카페,디저트>베이커리"),
  mockPlace("스타벅스 대전역점", "음식점>카페,디저트>커피전문점"),
  mockPlace("이디야커피 둔산점", "음식점>카페,디저트>커피전문점"),
  mockPlace("카페 드롭탑 대전", "음식점>카페,디저트>커피전문점"),
  mockPlace("투썸플레이스 대전", "음식점>카페,디저트>커피전문점"),
  mockPlace("텐퍼센트커피", "음식점>카페,디저트>커피전문점"),
];

const message = "근처 카페 추천해줘";
const filtered = filterCafeCandidates(naverLikeFlood, message, 5);
const enriched = enrichPlaceCandidates({
  candidates: filtered,
  origin: { lat: 36.35, lng: 127.38 },
  criteria: {
    intent: "FIND_CAFE",
    query: "카페",
    category: "cafe",
    cuisine_keyword: null,
    vibe: "unknown",
    only_open_now: true,
    min_rating: 4,
    max_results: 5,
    radius_m: 1500,
  },
  preference: { quiet_affinity: 0, visited_places: [], shadow_hint: null },
});

const { wire } = compilePlaceDiscovery(
  {
    criteria: {
      intent: "FIND_CAFE",
      query: "카페",
      category: "cafe",
      cuisine_keyword: null,
      vibe: "unknown",
      only_open_now: true,
      min_rating: 4,
      max_results: 5,
      radius_m: 1500,
    },
    candidates: enriched,
    preference: { quiet_affinity: 0, visited_places: [], shadow_hint: null },
  },
  { categoryLabel: "카페", anchor: "대전" }
);

const names = wire.options.map((option) => option.name);
const diversity = assertCafeDiscoveryDiversity(names, message);

assert.ok(diversity.ok, diversity.reason);
assert.ok(
  names.filter((name) => /성심당/i.test(name)).length <= 1,
  `UI would show all 성심당: ${names.join(", ")}`
);
assert.match(wire.summary, /카페.*5곳/);

console.log("test-cafe-discovery-diversity-qa: ok", { cards: names });
