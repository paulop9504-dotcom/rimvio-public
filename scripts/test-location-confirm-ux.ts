#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { planLocationConfirmUx } from "../lib/corrections/location-confirm-ux";
import type { LocationSuggestion } from "../lib/action-chat/confirmation-types";

const galleriaOptions: LocationSuggestion[] = [
  {
    id: "galleria-timeworld",
    label: "갤러리아 백화점 대전 타임월드점",
    place_name: "갤러리아",
    branch: "타임월드점",
    address: "대전 서구 둔산로 119",
  },
  {
    id: "galleria-centum",
    label: "갤러리아 센터시티점",
    place_name: "갤러리아",
    branch: "센터시티점",
    address: "대전 서구 둔산동 1016",
  },
  {
    id: "galleria-dunsan",
    label: "갤러리아 둔산점",
    place_name: "갤러리아",
    branch: "둔산점",
    address: "대전 서구 둔산동 1330",
  },
];

const extracted = {
  address: "대전 서구 둔산동",
  phone: null,
  datetime: null,
  place_name: "갤러리아",
  url: null,
};

const inline = planLocationConfirmUx({
  suggestions: galleriaOptions,
  extracted,
  message: "둔산동 갤러리아 예약해줘",
});

assert.equal(inline.mode, "inline_pick");
assert.ok(inline.suggestions.length >= 2);
assert.match(inline.prompt, /갤러리아/u);

const quick = planLocationConfirmUx({
  suggestions: [
    {
      id: "station-suseo",
      label: "수서역",
      place_name: "수서역",
      address: "서울 강남구",
    },
  ],
  extracted: { ...extracted, place_name: "수서역" },
  message: "3분뒤에 수서역 가야되",
});

assert.equal(quick.mode, "quick_pick");
assert.equal(quick.recommended_id, "station-suseo");
assert.match(quick.prompt, /갈까요/u);

console.log("test-location-confirm-ux: ok");
