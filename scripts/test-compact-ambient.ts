#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { buildSaveReceipt } from "../lib/feed/build-save-receipt";
import { hasCompactAmbientPoster } from "../lib/feed/resolve-compact-ambient-poster";

const githubLink = {
  original_url: "https://github.com/pricing",
  title: "Pricing · Plans for every developer",
  thumbnail_url:
    "https://github.githubassets.com/assets/pricing-1d2e2fb4b121.png",
  domain: "github.com",
  category: "research",
  created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
};

assert.equal(hasCompactAmbientPoster(githubLink), true);

const receipt = buildSaveReceipt(
  {
    id: "x",
    user_id: null,
    ...githubLink,
    actions: [],
    visual_mode: "brand",
    source_type: "github",
    share_slug: null,
    link_status: "open",
    room_id: null,
    expires_at: null,
  },
  "저장소 열기"
);

assert.equal(receipt.title, "Pricing · Plans for every developer");
assert.equal(receipt.lines[1]?.value, "GitHub");
assert.equal(receipt.footer, "다음 액션 · 저장소 열기");
assert.match(receipt.savedLabel, /시간 전|분 전/);

console.log("test-compact-ambient: ok");
