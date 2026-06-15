#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { parseFindPlaceIntent } from "../lib/context-resolver/discovery/parse-find-place-intent";
import {
  diningSearchLabel,
  filterRestaurantCandidates,
  isNonRestaurantCandidate,
  userWantsCafeOrDessert,
} from "../lib/context-resolver/places/filter-restaurant-candidates";
import type { PlaceCandidate } from "../lib/context-resolver/places/types";

function mockPlace(name: string, category: string): PlaceCandidate {
  return {
    place_id: name,
    name,
    address: null,
    lat: 36.33,
    lng: 127.43,
    rating: 0,
    open_now: true,
    vibes: ["unknown"],
    phone: null,
    maps_url: null,
    naver_category: category,
  };
}

assert.equal(diningSearchLabel("대전 맛집 추천"), "식당");
assert.equal(diningSearchLabel("강남 술집 추천"), "술집");
assert.equal(diningSearchLabel("근처 음식점"), "음식점");

const daejeon = parseFindPlaceIntent("대전역 근처 맛집추천좀");
assert.equal(daejeon?.naverQuery, "대전역 식당");

assert.ok(isNonRestaurantCandidate(mockPlace("성심당 본점", "음식점>카페,디저트>베이커리")));
assert.ok(
  isNonRestaurantCandidate(mockPlace("스타벅스 대전역점", "음식점>카페,디저트>커피전문점"))
);
assert.ok(!isNonRestaurantCandidate(mockPlace("한백식당", "음식점>한식>육류,고기요리")));
assert.ok(!isNonRestaurantCandidate(mockPlace("쿠우쿠우", "음식점>양식>뷔페")));

assert.equal(userWantsCafeOrDessert("성심당 추천"), true);
assert.equal(userWantsCafeOrDessert("대전 맛집"), false);

const mixed = [
  mockPlace("성심당", "음식점>카페,디저트>베이커리"),
  mockPlace("한백식당", "음식점>한식"),
  mockPlace("카페 드롭탑", "음식점>카페,디저트>카페"),
  mockPlace("명륜진사갈비", "음식점>한식>육류,고기요리"),
];

const filtered = filterRestaurantCandidates(mixed, "대전 맛집 추천");
assert.equal(filtered.length, 2);
assert.ok(filtered.every((place) => !/성심당|드롭탑/.test(place.name)));

const cafeQuery = filterRestaurantCandidates(mixed, "성심당 빵 추천");
assert.equal(cafeQuery.length, 4);

console.log("test-filter-restaurant-candidates: ok");
