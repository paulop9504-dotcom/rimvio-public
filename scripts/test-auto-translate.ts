#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { buildPageTranslateHref } from "../lib/actions/search-urls";
import {
  resolveAutoTranslatedOpenHref,
  shouldAutoTranslatePage,
} from "../lib/links/auto-translate-open";

assert.equal(
  shouldAutoTranslatePage(
    "https://www.google.com/maps/place/Eiffel+Tower",
    "ko"
  ),
  false,
  "Google Maps should open directly, not via translate wrapper"
);

assert.equal(
  resolveAutoTranslatedOpenHref(
    "https://www.google.com/maps/search/?api=1&query=Paris",
    "ko"
  ),
  "https://www.google.com/maps/search/?api=1&query=Paris",
  "map search href stays untranslated"
);

assert.equal(
  shouldAutoTranslatePage("https://maps.apple.com/?q=Eiffel+Tower", "ko"),
  false,
  "Apple Maps should open directly, not via Papago wrapper"
);

assert.equal(
  resolveAutoTranslatedOpenHref(
    "https://maps.apple.com/?q=Eiffel+Tower",
    "ko"
  ),
  "https://maps.apple.com/?q=Eiffel+Tower",
  "Apple Maps href stays untranslated"
);

const foreignArticle = "https://www.nytimes.com/2026/05/27/world/example.html";
assert.equal(shouldAutoTranslatePage(foreignArticle, "ko"), true);

const translated = resolveAutoTranslatedOpenHref(foreignArticle, "ko");
assert.match(
  translated,
  /^https:\/\/papago\.naver\.com\/website\?/,
  "Korean locale should use Papago instead of blocked Google Translate"
);
assert.ok(
  translated.includes(encodeURIComponent(foreignArticle)),
  "Papago href should embed original page URL"
);

const googleFallback = buildPageTranslateHref(
  foreignArticle,
  "fil",
  "fil"
);
assert.match(
  googleFallback,
  /^https:\/\/translate\.google\.com\/translate\?/,
  "Unsupported Papago targets fall back to Google Translate"
);

console.log("✓ auto-translate: maps skip + Papago for ko locale");
