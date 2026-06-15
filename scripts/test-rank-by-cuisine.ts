#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { rankPlaceCandidatesByCuisine } from "../lib/context-resolver/places/rank-by-cuisine-relevance";
import type { PlaceCandidate } from "../lib/context-resolver/places/types";

function mockPlace(name: string, category: string): PlaceCandidate {
  return {
    place_id: name,
    name,
    address: null,
    lat: 37.55,
    lng: 126.97,
    rating: 0,
    open_now: true,
    vibes: ["unknown"],
    phone: null,
    maps_url: null,
    naver_category: category,
  };
}

const ranked = rankPlaceCandidatesByCuisine(
  [
    mockPlace("맥도날드 서울역점", "음식점>패스트푸드>햄버거"),
    mockPlace("미도인 그랜드센트럴", "음식점>양식"),
    mockPlace("버거킹 서울역점", "양식>햄버거"),
    mockPlace("콤바크", "음식점>양식"),
  ],
  "스테이크"
);

assert.equal(ranked[0]?.name, "미도인 그랜드센트럴");
assert.ok(!ranked.slice(0, 3).some((place) => /맥도날드|버거킹/.test(place.name)));

const chickenRanked = rankPlaceCandidatesByCuisine(
  [
    mockPlace("로렐트리", "음식점>양식>이탈리아음식"),
    mockPlace("쌀국수집", "음식점>아시아>베트남음식"),
    mockPlace("교촌치킨 대구점", "음식점>치킨,닭강정"),
    mockPlace("멕시칸타코", "음식점>양식>멕시코,남미음식"),
  ],
  "치킨"
);

assert.equal(chickenRanked[0]?.name, "교촌치킨 대구점");
assert.ok(!chickenRanked.some((place) => /로렐|쌀국수|멕시칸/.test(place.name)));

console.log("test-rank-by-cuisine: ok");
