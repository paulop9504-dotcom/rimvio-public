#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  isCoordInKorea,
  isDomesticMapPlace,
  parseGoogleMapCoords,
} from "../lib/resolvers/place-map-region";
import { projectFeedMapActions } from "../lib/feed/project-feed-map-actions";
import { resolveActions } from "../lib/resolvers/index";

const EIFFEL_URL =
  "https://www.google.com/maps/place/Eiffel+Tower/@48.8584,2.2945";
const GANGNAM_URL =
  "https://www.google.com/maps/place/Gangnam+Station/@37.497,127.027";

assert.deepEqual(parseGoogleMapCoords(EIFFEL_URL), { lat: 48.8584, lng: 2.2945 });
assert.equal(isCoordInKorea(48.8584, 2.2945), false);
assert.equal(isCoordInKorea(37.497, 127.027), true);

assert.equal(
  isDomesticMapPlace({
    sourceUrl: EIFFEL_URL,
    title: "Eiffel Tower",
  }),
  false
);

assert.equal(
  isDomesticMapPlace({
    sourceUrl: GANGNAM_URL,
    title: "Gangnam Station",
  }),
  true
);

const kakaoOnly = [
  {
    id: "kakao",
    label: "카카오맵 바로 열기",
    kind: "open" as const,
    href: "https://map.kakao.com/link/map/test",
    payload: { icon: "kakaomap" },
  },
  {
    id: "kakao-search",
    label: "🗺 Eiffel Tow 검색",
    kind: "open" as const,
    href: "kakaomap://search?q=Eiffel%20Tower",
    payload: { icon: "kakaomap" },
  },
];

const projected = projectFeedMapActions(
  {
    original_url: EIFFEL_URL,
    title: "Eiffel Tower",
  },
  kakaoOnly
);

assert.ok(!projected.some((action) => /카카오|kakaomap/i.test(action.label)));
assert.ok(
  projected.some((action) =>
    /Google 지도|Google Earth/i.test(action.label)
  )
);

const enriched = resolveActions(
  [
    {
      id: "open",
      label: "📍 지도 열기",
      kind: "open",
      href: EIFFEL_URL,
    },
  ],
  { hour: 14, installedApps: ["kakaomap"] },
  EIFFEL_URL,
  { title: "Eiffel Tower" }
);

assert.ok(!enriched.some((action) => /카카오맵/i.test(action.label)));
assert.ok(
  enriched.some((action) => /Google 지도|Google Earth/i.test(action.label))
);

const domestic = resolveActions(
  [
    {
      id: "open",
      label: "📍 지도 열기",
      kind: "open",
      href: GANGNAM_URL,
    },
  ],
  { hour: 14, installedApps: ["kakaomap"] },
  GANGNAM_URL,
  { title: "강남역" }
);

assert.ok(domestic.some((action) => /카카오맵/i.test(action.label)));

console.log("test-place-map-region: ok");
