#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { shouldShowMarketPrice } from "../hooks/use-market-price";
import { buildProvisionalMarketSnapshot } from "../lib/commerce/client-market-estimate";
import { deriveCommerceVerdictPresentation } from "../lib/commerce/commerce-verdict-presentation";
import {
  buildSampleFeedLinks,
  SAMPLE_FEED_LINK_IDS,
} from "../lib/onboarding/sample-feed-links";
import { isSampleFeedLink } from "../lib/onboarding/sample-feed";
import {
  buildStudyReceiptFromLink,
  shouldShowStudyReceipt,
} from "../lib/study/build-study-receipt";

import {
  buildSampleFeedLinks,
  SAMPLE_FEED_LINK_IDS,
} from "../lib/onboarding/sample-feed-links";
import { isSampleFeedLink } from "../lib/onboarding/sample-feed";
import {
  buildStudyReceiptFromLink,
  shouldShowStudyReceipt,
} from "../lib/study/build-study-receipt";
import { shouldShowTimeReceipt } from "../lib/media/article-url";
import { shouldShowTrueCostReceipt } from "../hooks/use-true-cost-receipt";

const links = buildSampleFeedLinks();

assert.ok(links.length >= 10, `expected rich sample deck, got ${links.length}`);
assert.deepEqual(
  links.map((link) => link.id),
  [...SAMPLE_FEED_LINK_IDS]
);

const uniqueIds = new Set(links.map((link) => link.id));
assert.equal(uniqueIds.size, links.length, "sample ids must be unique");

for (const link of links) {
  assert.equal(isSampleFeedLink(link), true);
  assert.equal(link.actions[0]?.payload?.rimvioSample, true);
}

const commerce = links.find((l) => l.id === "sample-commerce-iphone")!;
assert.ok(commerce);
assert.equal(shouldShowMarketPrice(commerce), true);

const provisional = buildProvisionalMarketSnapshot({
  title: commerce.title,
  domain: commerce.domain,
});
assert.ok(provisional?.available);

const verdict = deriveCommerceVerdictPresentation({ market: provisional });
assert.notEqual(verdict?.kind, "pending");
assert.match(verdict?.stampLabel ?? "", /^EST\./);

const macbook = links.find((l) => l.id === "sample-commerce-macbook")!;
assert.equal(shouldShowTrueCostReceipt(macbook), true);

const study = links.find((l) => l.id === "sample-study-quantum")!;
assert.equal(shouldShowStudyReceipt(study), true);
const studyReceipt = buildStudyReceiptFromLink(study);
assert.equal(studyReceipt.available, true);
assert.ok(studyReceipt.lines.length >= 2);

const travel = links.find((l) => l.id === "sample-travel-jeju")!;
assert.equal(travel.category, "travel");
assert.ok(travel.actions.some((action) => /지도/.test(action.label)));

const youtube = links.find((l) => l.id === "sample-media-youtube")!;
assert.equal(shouldShowTimeReceipt(youtube), true);

const article = links.find((l) => l.id === "sample-article-news")!;
assert.equal(shouldShowTimeReceipt(article), true);

const food = links.find((l) => l.id === "sample-food-ramen")!;
assert.equal(food.category, "food");

console.log(`test-sample-feed: ok (${links.length} cards)`);
