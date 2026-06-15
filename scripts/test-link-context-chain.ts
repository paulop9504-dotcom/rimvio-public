#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  buildLinkHybridLabel,
  snapLinkContexts,
  writeLinkContextChain,
} from "../lib/feed/link-context-chain";
import type { LinkRow } from "../types/database";

const typhoon = {
  id: "link-typhoon",
  title: "제6호 태풍 장미",
  original_url: "https://example.com/typhoon",
  category: "news",
  created_at: new Date().toISOString(),
  domain: "example.com",
} as LinkRow;

const google = {
  id: "link-google",
  title: "구글 · 검색 · 번역",
  original_url: "https://google.com",
  category: "search",
  created_at: new Date().toISOString(),
  domain: "google.com",
} as LinkRow;

const chain = snapLinkContexts("link-typhoon", "link-google");
assert.deepEqual(chain?.linkIds.slice(0, 2), ["link-typhoon", "link-google"]);

const label = buildLinkHybridLabel([typhoon, google]);
assert.match(label, /태풍/);
assert.match(label, /구글/);

writeLinkContextChain(null);

console.log("test-link-context-chain: ok");
