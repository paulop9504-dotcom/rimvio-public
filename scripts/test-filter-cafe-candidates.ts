#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { parseFindPlaceIntent } from "../lib/context-resolver/discovery/parse-find-place-intent";
import {
  assertCafeDiscoveryDiversity,
  diversifyCandidatesByBrand,
  extractBrandKey,
  filterCafeCandidates,
  isBakeryHeavyCandidate,
  userWantsCoffeeShop,
} from "../lib/context-resolver/places/filter-cafe-candidates";
import type { PlaceCandidate } from "../lib/context-resolver/places/types";

function mockPlace(name: string, category: string): PlaceCandidate {
  return {
    place_id: name,
    name,
    address: "대전",
    lat: 36.35,
    lng: 127.38,
    rating: 4.2,
    open_now: true,
    vibes: ["unknown"],
    phone: null,
    maps_url: null,
    naver_category: category,
  };
}

assert.equal(userWantsCoffeeShop("근처 카페 추천해줘"), true);
assert.equal(userWantsCoffeeShop("성심당 빵 추천"), false);

assert.ok(isBakeryHeavyCandidate(mockPlace("성심당 본점", "음식점>카페,디저트>베이커리")));
assert.ok(!isBakeryHeavyCandidate(mockPlace("카페 드롭탑 대전점", "음식점>카페,디저트>커피전문점")));

assert.equal(extractBrandKey("성심당 DCC점"), "성심당");
assert.equal(extractBrandKey("스타벅스 대전역점"), "스타벅스");

const sungSimDangFlood = [
  mockPlace("성심당 본점", "음식점>카페,디저트>베이커리"),
  mockPlace("성심당 DCC점", "음식점>카페,디저트>베이커리"),
  mockPlace("성심당 대전역점", "음식점>카페,디저트>베이커리"),
  mockPlace("성심당 롯데백화점 대전점", "음식점>카페,디저트>베이커리"),
  mockPlace("성심당 케이크부띠끄", "음식점>카페,디저트>베이커리"),
  mockPlace("스타벅스 대전역점", "음식점>카페,디저트>커피전문점"),
  mockPlace("이디야커피 둔산점", "음식점>카페,디저트>커피전문점"),
  mockPlace("카페 드롭탑", "음식점>카페,디저트>커피전문점"),
  mockPlace("투썸플레이스", "음식점>카페,디저트>커피전문점"),
  mockPlace("텐퍼센트커피", "음식점>카페,디저트>커피전문점"),
];

const filtered = filterCafeCandidates(sungSimDangFlood, "근처 카페 추천해줘", 5);
const names = filtered.map((place) => place.name);

assert.equal(filtered.length, 5);
assert.ok(
  names.filter((name) => /성심당/i.test(name)).length <= 1,
  `expected at most one 성심당, got: ${names.join(", ")}`
);
assert.ok(new Set(names.map(extractBrandKey)).size >= 4, `low brand diversity: ${names.join(", ")}`);

const diversity = assertCafeDiscoveryDiversity(names, "근처 카페 추천해줘");
assert.ok(diversity.ok, diversity.reason);

const deduped = diversifyCandidatesByBrand(sungSimDangFlood, 5);
assert.equal(deduped.length, 5);
assert.equal(new Set(deduped.map((p) => extractBrandKey(p.name))).size, 5);

const cafeIntent = parseFindPlaceIntent("근처 카페 추천해줘");
assert.ok(cafeIntent);
assert.equal(cafeIntent!.category, "cafe");

console.log("test-filter-cafe-candidates: ok", { sample: names });
