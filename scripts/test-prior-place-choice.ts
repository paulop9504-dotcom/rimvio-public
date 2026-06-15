#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  resetCorrectionLogForTests,
} from "../lib/corrections/correction-log";
import {
  correctionLogToPriorSuggestion,
  extractPlaceIntentKey,
  planPriorPlaceConfirmUx,
  resolvePriorPlaceChoice,
} from "../lib/corrections/prior-place-choice";
import { orchestratePlaceConfirm } from "../lib/action-chat/orchestrate-place-confirm";
import type { CorrectionLogEntry } from "../lib/action-chat/confirmation-types";

const logs: CorrectionLogEntry[] = [
  {
    id: "cl-1",
    user_input: "둔산동 갤러리아 예약해줘",
    ai_inferred_place_name: "갤러리아",
    ai_inferred_location: "대전 서구 둔산동",
    user_corrected_place_name: "갤러리아",
    user_corrected_location: "대전 서구 둔산로 119",
    outcome: "corrected",
    createdAt: "2026-05-20T10:00:00.000Z",
  },
  {
    id: "cl-2",
    user_input: "강남 헤어숍 예약",
    ai_inferred_place_name: "헤어숍",
    ai_inferred_location: null,
    user_corrected_place_name: "강남점",
    user_corrected_location: "서울 강남구 역삼동",
    outcome: "corrected",
    createdAt: "2026-05-25T10:00:00.000Z",
  },
];

resetCorrectionLogForTests(logs);

assert.equal(extractPlaceIntentKey({ message: "갤러리아 예약" }), "갤러리아");

const prior = resolvePriorPlaceChoice({
  message: "둔산 갤러리아 또 예약해줘",
  logs,
});

assert.ok(prior);
assert.equal(prior?.matched_intent, "갤러리아");
assert.equal(prior?.suggestion.is_prior, true);
assert.match(prior?.suggestion.label ?? "", /지난번 선택/u);

const suggestion = correctionLogToPriorSuggestion(logs[1]!);
assert.ok(suggestion);
assert.match(suggestion?.label ?? "", /강남점/u);

const ux = planPriorPlaceConfirmUx({
  prior: prior!.suggestion,
  subject: "갤러리아",
});

assert.equal(ux.mode, "prior_pick");
assert.equal(ux.suggestions[0]?.is_prior, true);
assert.match(ux.prompt, /지난번/u);

async function main() {
  const result = await orchestratePlaceConfirm({
    message: "갤러리아 예약해줘",
    referenceDate: "2026-05-29",
    priorPlaceChoice: prior,
  });

  assert.ok(result);
  assert.equal(result?.confirmation?.location_ux?.mode, "prior_pick");
  assert.equal(result?.confirmation?.location_suggestions?.[0]?.is_prior, true);
  console.log("test-prior-place-choice: ok");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
