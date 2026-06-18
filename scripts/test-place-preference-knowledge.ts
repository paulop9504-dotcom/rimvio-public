#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { mergeCorrectionLogEntries } from "../lib/corrections/merge-correction-logs";
import {
  recallPlacePreferencesFromWire,
  preferenceFromCorrection,
} from "../lib/corrections/place-preference-knowledge";
import { resetCorrectionLogForTests } from "../lib/corrections/correction-log";
import { resetKnowledgeEntityMemoryForTests } from "../lib/knowledge/knowledge-entity-db";
import { tryKnowledgeRecall } from "../lib/action-chat/action-oriented-handler";
import type { CorrectionLogEntry } from "../lib/action-chat/confirmation-types";

const local: CorrectionLogEntry[] = [
  {
    id: "cl-local",
    user_input: "갤러리아",
    ai_inferred_place_name: "갤러리아",
    ai_inferred_location: null,
    user_corrected_place_name: "갤러리아",
    user_corrected_location: "대전 둔산로 119",
    outcome: "corrected",
    createdAt: "2026-05-28T10:00:00.000Z",
  },
];

const remote: CorrectionLogEntry[] = [
  {
    id: "cl-remote",
    user_input: "헤어숍",
    ai_inferred_place_name: "헤어숍",
    ai_inferred_location: null,
    user_corrected_place_name: "강남점",
    user_corrected_location: "서울 강남구",
    outcome: "corrected",
    createdAt: "2026-05-29T10:00:00.000Z",
  },
];

const merged = mergeCorrectionLogEntries(local, remote);
assert.equal(merged.length, 2);
assert.equal(merged[0]?.id, "cl-remote");

const pref = preferenceFromCorrection(local[0]!);
assert.ok(pref);
assert.equal(pref?.intent_key, "갤러리아");

const recalled = recallPlacePreferencesFromWire({
  message: "갤러리아 단골 어디였지",
  preferences: [pref!],
});
assert.equal(recalled.length, 1);

resetCorrectionLogForTests();
resetKnowledgeEntityMemoryForTests();

async function main() {
  const result = await tryKnowledgeRecall("갤러리아 단골 어디였지", {
    placePreferences: [pref!],
  });
  assert.ok(result);
  assert.match(result?.summary ?? "", /갤러리아/u);
  assert.equal(result?.knowledgeSaved?.[0]?.type, "place");
  console.log("test-place-preference-knowledge: ok");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
