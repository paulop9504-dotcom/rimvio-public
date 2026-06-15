#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  computeActionCountdown,
  resolveActionDatetimeIso,
} from "../lib/action-chat/action-countdown";
import { parseRelativeDateTimeFromText } from "../lib/action-chat/action-agent-normalize";
import { buildExtractedDataFromText } from "../lib/action-chat/confirmation-logic";
import { tryBatchConfirmPriority } from "../lib/action-chat/batch-confirm-priority";

const iso = parseRelativeDateTimeFromText("3분뒤에 수서역 가야되", "2026-05-29");
assert.ok(iso, "3분뒤 should parse to datetime");

const parsed = new Date(iso!);
const deltaMinutes = (parsed.getTime() - Date.now()) / 60_000;
assert.ok(deltaMinutes >= 2 && deltaMinutes <= 4, `expected ~3 min ahead, got ${deltaMinutes}`);

const extracted = buildExtractedDataFromText("3분뒤에 수서역 가야되", "2026-05-29");
assert.ok(extracted.datetime, "confirmation extracted_data should include datetime");
assert.match(extracted.place_name ?? "", /수서역/);

const confirm = tryBatchConfirmPriority({
  message: "3분뒤에 수서역 가야되",
  referenceDate: "2026-05-29",
});
assert.ok(confirm?.confirmation?.extracted_data?.datetime, "CONFIRM wire should carry datetime");

const resolved = resolveActionDatetimeIso({
  extracted: confirm!.confirmation!.extracted_data,
  batchPending: confirm!.confirmation!.batch_pending,
});
assert.equal(resolved, confirm!.confirmation!.extracted_data!.datetime);

const now = Date.parse("2026-05-29T12:00:00+09:00");
const snapshot = computeActionCountdown("2026-05-29T12:03:00", now);
assert.ok(snapshot);
assert.equal(snapshot!.clock, "3:00");
assert.equal(snapshot!.headline, "3분 후");
assert.equal(snapshot!.isImminent, false);

const imminent = computeActionCountdown("2026-05-29T12:01:30", now);
assert.ok(imminent?.isImminent);

console.log("test-action-countdown: ok");
