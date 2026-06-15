import assert from "node:assert/strict";
import { estimateReadingMinutesFromText } from "../lib/media/estimate-reading-time";
import { formatDurationFromSeconds, formatDurationLabel } from "../lib/media/format-duration";
import { parseYouTubeDurationFromHtml } from "../lib/media/fetch-youtube-duration";
import { isArticleUrl, shouldShowTimeReceipt } from "../lib/media/article-url";
import {
  applyFocusMinutes,
  buildArticleReceipt,
  buildYouTubeReceipt,
} from "../lib/media/time-receipt";

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ok ${name}`);
  } catch (error) {
    console.error(`  fail ${name}`);
    throw error;
  }
}

console.log("time receipt");

test("formatDurationLabel handles hours", () => {
  assert.equal(formatDurationLabel(42), "42분");
  assert.equal(formatDurationLabel(60), "1시간");
  assert.equal(formatDurationLabel(95), "1시간 35분");
});

test("parseYouTubeDurationFromHtml reads lengthSeconds", () => {
  const html = `"videoDetails":{"lengthSeconds":"2534"}`;
  assert.equal(parseYouTubeDurationFromHtml(html), 2534);
  assert.equal(formatDurationFromSeconds(2534), "43분");
});

test("estimateReadingMinutesFromText handles Korean body", () => {
  const text = "가".repeat(1800);
  assert.equal(estimateReadingMinutesFromText(text), 4);
});

test("buildYouTubeReceipt applies focus multiplier", () => {
  const receipt = buildYouTubeReceipt("Sample", 42 * 60);
  assert.equal(receipt.available, true);
  assert.equal(receipt.baseMinutes, 42);
  assert.equal(receipt.focusedMinutes, applyFocusMinutes(42));
  assert.match(receipt.headline, /42분/);
});

test("buildArticleReceipt builds reading lines", () => {
  const receipt = buildArticleReceipt("News", 8);
  assert.equal(receipt.kind, "article");
  assert.equal(receipt.lines.length, 3);
  assert.match(receipt.headline, /8분/);
});

test("shouldShowTimeReceipt detects youtube and articles", () => {
  assert.equal(
    shouldShowTimeReceipt({
      original_url: "https://www.youtube.com/watch?v=abc",
      domain: "youtube.com",
      source_type: "youtube",
      category: "media",
    }),
    true
  );

  assert.equal(
    shouldShowTimeReceipt({
      original_url: "https://news.naver.com/article/123",
      domain: "news.naver.com",
      source_type: "naver",
      category: "research",
    }),
    true
  );

  assert.equal(
    shouldShowTimeReceipt({
      original_url: "https://web.joongna.com/product/1",
      domain: "web.joongna.com",
      source_type: "commerce",
      category: "shopping",
    }),
    false
  );
});

test("isArticleUrl excludes naver map", () => {
  assert.equal(
    isArticleUrl("https://map.naver.com/p/search/cafe/1", "map", "travel"),
    false
  );
});

console.log("time receipt 7/7");
