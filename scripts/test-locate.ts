#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { shortBranchLabel, sharesPlaceBrand } from "../lib/locate/branch-label";
import { buildLocateActions } from "../lib/locate/build-locate-actions";
import { isFoodVision } from "../lib/capture/classify-legacy-place-product";
import { detectCaptureIntent } from "../lib/capture/detect-capture-intent";
import {
  resolveLocateRemoteFromResult,
  resolveLocateRemoteLoading,
} from "../lib/locate/resolve-locate-remote";
import {
  buildBaeminPlaceSearchHref,
  buildNaverPlaceReviewHref,
} from "../lib/locate/place-service-links";
import { buildNmapRouteHref } from "../lib/locate/normalize-place-name";

assert.equal(shortBranchLabel("떡반집 갈마점", "떡반집"), "갈마점");
assert.equal(shortBranchLabel("떡반집", "떡반집"), "떡반집");
assert.equal(sharesPlaceBrand("떡반집 갈마점", "떡반집"), true);
assert.equal(sharesPlaceBrand("맥도날드 강남점", "떡반집"), false);

const baemin = buildBaeminPlaceSearchHref("떡반집 갈마점");
assert.match(baemin.href, /^baemin:\/\/webview\?/);
assert.match(baemin.fallbackHref ?? "", /baemin\.com\/search/);

assert.match(buildNaverPlaceReviewHref("떡반집"), /map\.naver\.com/);

const primaryPlace = {
  place_name: "떡반집 갈마점",
  formatted_address: "대전광역시 서구 갈마동 343-25",
  lat: 36.350355,
  lng: 127.375628,
  google_place_id: "ChIJ-galma",
  cached: false,
};

const alternatePlace = {
  place_name: "떡반집 둔산본점",
  formatted_address: "대전 서구 둔산로 8",
  lat: 36.3508,
  lng: 127.3846,
  google_place_id: "ChIJ-dunsan",
  cached: false,
};

const actions = buildLocateActions({
  place: primaryPlace,
  alternatePlaces: [alternatePlace],
  brandHint: "떡반집",
  contextSignal: "📍 대전 떡반집 시그니처(떡반+토스트) · 낙서 벽 분식집",
});

assert.equal(
  actions.context_signal,
  "📍 대전 떡반집 시그니처(떡반+토스트) · 낙서 벽 분식집"
);
assert.equal(actions.primary_action.label, "🗺️ 떡반집 갈마점 길찾기");
assert.match(actions.primary_action.href, /^nmap:\/\/route\/public\?/);
assert.equal(
  actions.primary_action.href,
  buildNmapRouteHref({
    lat: primaryPlace.lat,
    lng: primaryPlace.lng,
    placeName: primaryPlace.place_name,
  })
);

const labels = actions.secondary_actions.map((action) => action.label);
assert.ok(labels.some((label) => label.includes("둔산본점") || label.includes("📍")));
assert.ok(labels.some((label) => label.includes("배민")));
assert.ok(labels.some((label) => label.includes("네이버 리뷰")));
assert.ok(labels.some((label) => label.includes("주소 복사")));

const remote = resolveLocateRemoteFromResult(actions);
assert.equal(remote.packId, "place");
assert.equal(remote.primary?.label, "🗺️ 떡반집 갈마점 길찾기");
assert.match(remote.primary?.href ?? "", /^nmap:\/\//);

const loading = resolveLocateRemoteLoading();
assert.equal(loading.visible, true);
assert.equal(loading.primary, null);

assert.equal(
  isFoodVision({
    bestGuessLabels: ["Korean food"],
    labels: ["Dish", "Cuisine"],
  }),
  true
);

const foodPhotoIntent = detectCaptureIntent({
  text: "",
  vision: {
    bestGuessLabels: ["Tteokbokki"],
    labels: ["Food", "Dish"],
  },
});
assert.equal(foodPhotoIntent?.kind, "place");

console.log("test-locate: ok");
