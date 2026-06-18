#!/usr/bin/env npx tsx
/** Unit tests for Android share URL building (mirrors AndroidShareIntentRouter). */

import assert from "node:assert/strict";

function encode(value: string): string {
  return encodeURIComponent(value);
}

function buildShareUrl(
  server: string,
  url: string | null,
  text: string | null,
  title: string | null,
): string {
  const parts: string[] = [];
  if (url) parts.push(`url=${encode(url)}`);
  if (text) parts.push(`text=${encode(text)}`);
  if (title) parts.push(`title=${encode(title)}`);
  return `${server.replace(/\/$/, "")}/share?${parts.join("&")}`;
}

function extractUrl(text: string | null): string | null {
  if (!text) return null;
  const match = text.trim().match(/(https?:\/\/[^\s]+)/i);
  return match?.[1] ?? null;
}

assert.equal(
  buildShareUrl(
    "https://rimvio.app",
    "https://map.naver.com/p/search/강릉",
    "강릉",
    "지도",
  ),
  "https://rimvio.app/share?url="
    + encodeURIComponent("https://map.naver.com/p/search/강릉")
    + "&text="
    + encodeURIComponent("강릉")
    + "&title="
    + encodeURIComponent("지도"),
);

assert.equal(
  extractUrl("링크 https://youtube.com/watch?v=abc 여기"),
  "https://youtube.com/watch?v=abc",
);

console.log("test-android-share-intent-router: ok");
