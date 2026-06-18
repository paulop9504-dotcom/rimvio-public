#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { sanitizeParamValue } from "../lib/action-dispatcher/sanitize-action-params";
import { resolveDeepLinkDispatch } from "../lib/deep-link-dispatch/resolve-dispatch";
import { buildKakaoMapSearchHref } from "../lib/resolvers/deep-links";
import {
  lockEntities,
  normalizeTypoInput,
  parseDeeplinkSearchSeed,
  resolveSearchIntent,
  resolveSearchQuery,
  resolveSearchQueryFromDeeplink,
} from "../lib/search-intent";

// Entity locking — brand stays atomic
const kuuLocks = lockEntities("쿠우쿠우 가격");
assert.equal(kuuLocks.length, 1);
assert.equal(kuuLocks[0]!.value, "쿠우쿠우");

const geoLocks = lockEntities("서울 강남 맛집 추천");
assert.ok(geoLocks.some((lock) => lock.value.includes("서울")));
assert.ok(geoLocks.some((lock) => lock.value.includes("강남")));

// Semantic frame + multi-candidate expansion
const kuuIntent = resolveSearchIntent({ text: "쿠우쿠우 가격" });
assert.equal(kuuIntent.frame.entities[0], "쿠우쿠우");
assert.equal(kuuIntent.frame.intent, "price_inquiry");
assert.equal(kuuIntent.candidates.length, 3);
assert.ok(kuuIntent.candidates.some((c) => c.kind === "expanded" && /뷔페/.test(c.query)));
assert.match(kuuIntent.primary.query, /쿠우쿠우/);
assert.match(kuuIntent.primary.query, /가격/);

const placeIntent = resolveSearchIntent({ text: "서울 강남 맛집 추천" });
assert.equal(placeIntent.frame.intent, "place_search");
assert.match(placeIntent.primary.query, /서울/);
assert.match(placeIntent.primary.query, /강남/);
assert.match(placeIntent.primary.query, /맛집|추천/);

// Deeplink seed is intent seed, not final query
const seed = parseDeeplinkSearchSeed("kakaomap://search?q=%EC%BF%A0%EC%9A%B0%EC%BF%A0%EC%9A%B0%20%EA%B0%80%EA%B2%A9");
assert.equal(seed, "쿠우쿠우 가격");

const fromDeeplink = resolveSearchQueryFromDeeplink(
  "nmap://search?query=%EC%BF%A0%EC%9A%B0%EC%BF%A0%EC%9A%B0%20%EA%B0%80%EA%B2%A9"
);
assert.ok(fromDeeplink);
assert.match(fromDeeplink!, /쿠우쿠우/);

// Ranker prefers entity + intent preservation
const ranked = resolveSearchIntent({ text: "쿠우쿠우 가격 알려줘" });
assert.ok(ranked.primary.score >= 0.45);
assert.equal(ranked.candidates[0]!.kind, ranked.primary.kind);

// Sanitizer uses semantic frame (no token split)
const sanitized = sanitizeParamValue("쿠우쿠우 가격");
assert.match(sanitized.value, /쿠우쿠우/);
assert.match(sanitized.value, /가격/);

// Deep link dispatch navigation still resolves destination
const nav = resolveDeepLinkDispatch("강남역까지 길 찾아줘");
assert.ok(nav);
assert.equal(nav!.action.status, "READY_TO_EXECUTE");
assert.match(nav!.action.deep_link, /kakaomap:\/\/search\?q=/);

const href = buildKakaoMapSearchHref("쿠우쿠우 가격");
assert.match(decodeURIComponent(href), /쿠우쿠우/);

assert.equal(resolveSearchQuery({ text: "쿠우쿠우 가격" }), kuuIntent.primary.query);

// Typo layer — entity continuity
const partialBrand = normalizeTypoInput("쿠우쿠 가격");
assert.match(partialBrand.normalized, /쿠우쿠우/);

const geoTypo = normalizeTypoInput("강남마집 추천");
assert.match(geoTypo.normalized, /강남/);
assert.match(geoTypo.normalized, /맛집/);

const typoIntent = resolveSearchIntent({ text: "쿠우쿠 가격" });
assert.equal(typoIntent.frame.entities[0], "쿠우쿠우");
assert.equal(typoIntent.frame.intent, "price_inquiry");

console.log("test-search-intent: ok");
