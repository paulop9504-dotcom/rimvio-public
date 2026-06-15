#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { formatRelativeKo } from "../lib/time/format-relative-ko";

const now = Date.parse("2026-06-03T12:00:00.000Z");
assert.equal(
  formatRelativeKo("2026-06-03T11:59:30.000Z", now),
  "방금 전",
);
assert.equal(
  formatRelativeKo("2026-06-03T11:55:00.000Z", now),
  "5분 전",
);

console.log("test-format-relative-ko: ok");
