#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { decomposeInput, pickPrimaryPlaceTask } from "../lib/action-chat/decompose-input";
import { dispatchTasks } from "../lib/action-chat/dispatch-tasks";
import { getPlaceFromFragment } from "../lib/action-chat/fragment-extractors";
import { processActionAgentBatch } from "../lib/action-chat/action-agent-batch";
import { buildExtractedDataFromText } from "../lib/action-chat/confirmation-logic";

const mixed =
  "오늘 오후 2시에 둔산동 갤러리아에서 쇼핑하고 3시에 레스토랑 예약해줘";

const decomposed = decomposeInput(mixed, { referenceDate: "2026-05-29" });
assert.ok(decomposed);
assert.equal(decomposed!.tasks.length, 2);

const shopping = decomposed!.tasks[0]!;
assert.equal(shopping.intent, "SHOPPING");
assert.match(shopping.place ?? "", /갤러리아|둔산/);
assert.ok(!shopping.raw_snippet.includes("레스토랑"));
assert.notEqual(shopping.raw_snippet, mixed);

const reservation = decomposed!.tasks[1]!;
assert.equal(reservation.intent, "RESERVATION");
assert.match(reservation.place ?? "", /레스토랑/);
assert.ok(!reservation.raw_snippet.includes("쇼핑"));

assert.notEqual(getPlaceFromFragment(mixed), mixed, "full sentence must not be returned as place label");
assert.ok((getPlaceFromFragment(mixed)?.length ?? 0) <= 16, "place label must be a short proper noun");
assert.match(getPlaceFromFragment(shopping.raw_snippet) ?? "", /갤러리아|둔산/);

const dispatched = dispatchTasks(decomposed!, {
  referenceDate: "2026-05-29",
  fullMessage: mixed,
});
assert.ok(dispatched);
assert.ok(dispatched!.results.length >= 2, "each intent should produce independent tasks");

const batch = processActionAgentBatch(mixed, { referenceDate: "2026-05-29" });
assert.ok(batch);
assert.ok(batch!.results.length >= 2);

const extracted = buildExtractedDataFromText(mixed, "2026-05-29");
assert.match(extracted.place_name ?? "", /갤러리아|둔산/);
assert.notEqual(extracted.place_name, mixed);

const primary = pickPrimaryPlaceTask(decomposed);
assert.ok(primary);
assert.match(primary!.place ?? "", /갤러리아|둔산/);

const travel = decomposeInput("3분뒤 수서역 가야됨", { referenceDate: "2026-05-29" });
assert.ok(travel);
assert.equal(travel!.tasks[0]!.place, "수서역");
assert.equal(travel!.tasks[0]!.intent, "NAVIGATION");

console.log("test-multi-intent-decompose: ok");
