#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { katechToLatLng } from "../lib/naver/katech-to-wgs84";
import { parseNaverSearchKind } from "../lib/naver/search-api";
import { naverLocalItemToPlaceCandidate } from "../lib/naver/local-to-place-candidate";

assert.equal(parseNaverSearchKind("local"), "local");
assert.equal(parseNaverSearchKind("shop"), "shop");
assert.equal(parseNaverSearchKind("web"), "webkr");
assert.equal(parseNaverSearchKind("shopping"), "shop");
assert.equal(parseNaverSearchKind("invalid"), null);

const coords = katechToLatLng("1269789891", "375665473");
assert.ok(coords);
assert.ok(coords.lat > 37.5 && coords.lat < 37.6);
assert.ok(coords.lng > 126.9 && coords.lng < 127.0);

const place = naverLocalItemToPlaceCandidate({
  title: "테스트 카페",
  link: "https://map.naver.com/p/search/test",
  category: "음식점>카페",
  description: "",
  telephone: "02-1234-5678",
  address: "서울 강남구",
  roadAddress: "서울 강남구 테헤란로",
  mapx: "1269789891",
  mapy: "375665473",
});
assert.ok(place);
assert.equal(place?.name, "테스트 카페");

console.log("test-naver-search-api: ok");
