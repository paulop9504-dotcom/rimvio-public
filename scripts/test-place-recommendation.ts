#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { parseFindPlaceIntent, isPlaceRecommendationQuery } from "../lib/context-resolver/discovery/parse-find-place-intent";
import { compilePlaceDiscovery } from "../lib/context-resolver/discovery/compile-place-discovery";
import type { PlaceDiscoveryContext } from "../lib/context-resolver/places/types";

const daejeon = parseFindPlaceIntent("대전역 근처 맛집추천좀");
assert.ok(daejeon);
assert.equal(daejeon?.category, "restaurant");
assert.equal(daejeon?.anchor, "대전역");
assert.equal(daejeon?.naverQuery, "대전역 식당");

const steak = parseFindPlaceIntent("서울역 근처 스테이크 맛집좀 추천");
assert.ok(steak);
assert.equal(steak?.cuisine, "스테이크");
assert.equal(steak?.anchor, "서울역");
assert.equal(steak?.naverQuery, "서울역 스테이크");

const cafe = parseFindPlaceIntent("지금 갈 만한 조용한 카페 추천해줘");
assert.ok(cafe);
assert.equal(cafe?.category, "cafe");
assert.match(cafe?.naverQuery ?? "", /카페/);

const activity = parseFindPlaceIntent("대전 놀만한곳 추천좀");
assert.ok(activity, "activity discovery should match");
assert.equal(activity?.category, "activity");
assert.equal(activity?.anchor, "대전");
assert.equal(activity?.activity, "놀만한곳");
assert.equal(activity?.naverQuery, "대전 가볼만한곳");

const dateCourse = parseFindPlaceIntent("서울 데이트코스 추천해줘");
assert.ok(dateCourse);
assert.equal(dateCourse?.category, "activity");
assert.equal(dateCourse?.naverQuery, "서울 데이트코스");

const daeguChickenShop = parseFindPlaceIntent("대구광역시 치킨집 추천");
assert.ok(daeguChickenShop);
assert.equal(daeguChickenShop?.category, "restaurant");
assert.equal(daeguChickenShop?.cuisine, "치킨");
assert.equal(daeguChickenShop?.anchor, "대구");
assert.equal(daeguChickenShop?.naverQuery, "대구 치킨집");

const daeguChicken = parseFindPlaceIntent("대구 치킨 추천");
assert.ok(daeguChicken);
assert.equal(daeguChicken?.category, "restaurant");
assert.equal(daeguChicken?.cuisine, "치킨");
assert.equal(daeguChicken?.naverQuery, "대구 치킨집");

const daejeonChicken = parseFindPlaceIntent("대전 치킨 맛집 추천");
assert.ok(daejeonChicken);
assert.equal(daejeonChicken?.naverQuery, "대전 치킨집");

assert.equal(isPlaceRecommendationQuery("대전 놀만한곳 추천좀"), true);
assert.equal(isPlaceRecommendationQuery("성심당 가자"), false);

const mockContext: PlaceDiscoveryContext = {
  criteria: {
    intent: "FIND_PLACE",
    query: "대전역 맛집",
    category: "restaurant",
    cuisine_keyword: null,
    vibe: "unknown",
    only_open_now: false,
    min_rating: 0,
    max_results: 3,
    radius_m: 3000,
  },
  preference: { quiet_affinity: 0, visited_places: [], shadow_hint: null },
  candidates: [
    {
      place_id: "p1",
      name: "대전역 한식당",
      address: "대전 동구",
      lat: 36.33,
      lng: 127.43,
      rating: 4.2,
      open_now: true,
      vibes: ["unknown"],
      phone: "042-000-0000",
      maps_url: "https://map.naver.com/p/search/test",
      reason: "지금 영업 중, 평점 높음",
      travel_minutes: 8,
      arrive_at_clock: "12:08",
      shadow_match: false,
    },
  ],
};

const compiled = compilePlaceDiscovery(mockContext, {
  categoryLabel: "맛집",
  anchor: "대전역",
});
assert.match(compiled.wire.summary, /대전역 근처/);
assert.match(compiled.wire.summary, /맛집/);
assert.ok(compiled.actions.length >= 2);

console.log("test-place-recommendation: ok");
