#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { resolveFeedStoryLayout } from "../lib/feed/resolve-feed-story-layout";
import {
  hasFeedCoverThumbnail,
  isFeedCoverCategory,
} from "../lib/feed/resolve-feed-cover";
import { FEED_MAX_SECONDARY } from "../lib/feed/feed-panel-limits";
import { resolveFeedCardSecondaries } from "../lib/feed/resolve-feed-card-panel";
import type { LinkRow } from "../types/database";

assert.equal(FEED_MAX_SECONDARY, 1);

assert.equal(isFeedCoverCategory("travel"), true);
assert.equal(isFeedCoverCategory("food"), true);
assert.equal(isFeedCoverCategory("shopping"), false);

const travelPhoto: Pick<
  LinkRow,
  "thumbnail_url" | "domain" | "original_url" | "source_type" | "category"
> = {
  thumbnail_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/Times_Square.jpg/800px-Times_Square.jpg",
  domain: "blog.naver.com",
  original_url: "https://blog.naver.com/travel/post",
  source_type: "article",
  category: "travel",
};

assert.equal(hasFeedCoverThumbnail(travelPhoto), true);
assert.equal(resolveFeedStoryLayout(travelPhoto), "capture-cover");

const naverPortal: typeof travelPhoto = {
  thumbnail_url: "https://s.pstatic.net/static/www/ogtag/og_default.png",
  domain: "naver.com",
  original_url: "https://www.naver.com",
  source_type: "portal",
  category: "social",
};

assert.equal(hasFeedCoverThumbnail(naverPortal), false);
assert.equal(resolveFeedStoryLayout(naverPortal), "compact");

const screenshot: typeof travelPhoto = {
  thumbnail_url: "https://cdn.example.com/capture.jpg",
  domain: "rimvio.app",
  original_url: "https://rimvio.app/capture/abc",
  source_type: "screenshot",
  category: "travel",
};

assert.equal(resolveFeedStoryLayout(screenshot), "capture-cover");

const secondaries = resolveFeedCardSecondaries(
  [
    { id: "a", label: "지도", kind: "open", href: "https://map.example" },
    { id: "b", label: "Google 지도", kind: "open", href: "https://google.com/maps" },
    { id: "c", label: "캐치테이블", kind: "open", href: "https://catchtable.co.kr" },
  ],
  { id: "a", label: "지도", kind: "open", href: "https://map.example" }
);

assert.equal(secondaries.length, 1);
assert.equal(secondaries[0]?.id, "b");

console.log("test-feed-story-layout: ok");
