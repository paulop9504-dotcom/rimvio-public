import assert from "node:assert/strict";
import { parseImageExifFromBytes } from "../lib/location-ping/read-image-exif-metadata";
import {
  HISTORICAL_CAPTURE_THRESHOLD_MS,
  isHistoricalCaptureMs,
} from "../lib/location-ping/resolve-capture-spacetime";

function testLatin1FallbackDate() {
  const padding = new Uint8Array(200).fill(0x20);
  const tail = new TextEncoder().encode("DateTimeOriginal\x002025:07:02 14:30:00");
  const bytes = new Uint8Array(padding.length + tail.length);
  bytes.set(padding, 0);
  bytes.set(tail, padding.length);
  const parsed = parseImageExifFromBytes(bytes);
  assert.ok(parsed.dateTimeIso?.includes("2025-07-02"));
}

function testHistoricalThreshold() {
  const now = Date.parse("2026-06-10T12:00:00.000Z");
  const past = now - HISTORICAL_CAPTURE_THRESHOLD_MS - 60_000;
  assert.equal(isHistoricalCaptureMs(past, now), true);
  assert.equal(isHistoricalCaptureMs(now - 60_000, now), false);
}

testLatin1FallbackDate();
testHistoricalThreshold();
console.log("test-read-image-exif: ok");
