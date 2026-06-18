#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { classifySearchComposerIntent } from "../lib/search/classify-search-composer-intent";

assert.equal(classifySearchComposerIntent("@길찾기 제주"), "mention");
assert.equal(classifySearchComposerIntent("https://blog.example/jeju"), "capture");
assert.equal(classifySearchComposerIntent("맛집 추천해줘"), "generic_ai");
assert.equal(classifySearchComposerIntent("배고파"), "generic_ai");
assert.equal(classifySearchComposerIntent("길찾기"), "generic_ai");
assert.equal(classifySearchComposerIntent("제주 3박 여행 일정 메모"), "capture");
assert.equal(classifySearchComposerIntent("제주 맛집 리스트 메모"), "capture");
assert.equal(classifySearchComposerIntent("7시 강남 약속"), "capture");
assert.equal(classifySearchComposerIntent("민수 제주"), "context_search");
assert.equal(classifySearchComposerIntent("제주 추억"), "context_search");
assert.equal(classifySearchComposerIntent("맛집 추천"), "generic_ai");

console.log("✓ classify-search-composer-intent");
