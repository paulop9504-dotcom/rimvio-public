#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  autoSaveKnowledgeFromMessage,
  detectVerbWithoutTime,
  resetKnowledgeEntityMemoryForTests,
  tryKnowledgeRecall,
} from "../lib/action-chat/action-oriented-handler";
import { ACTION_ORIENTED_PROMPT_BLOCK } from "../lib/action-chat/action-oriented-prompt";
import {
  resetKnowledgeEntityMemoryForTests as resetDb,
  saveKnowledgeEntity,
  searchKnowledgeEntities,
} from "../lib/knowledge/knowledge-entity-db";

resetKnowledgeEntityMemoryForTests();
resetDb();

assert.match(ACTION_ORIENTED_PROMPT_BLOCK, /DatePicker/);
assert.match(ACTION_ORIENTED_PROMPT_BLOCK, /Knowledge Container/);

assert.equal(detectVerbWithoutTime("내일 강남역에서 만날게"), null);
assert.equal(detectVerbWithoutTime("강남역에서 만날게"), "강남역에서");

void (async () => {
  await saveKnowledgeEntity({
    containerId: "data",
    type: "phone",
    label: "연락처",
    value: "01012345678",
    sourceMessage: "010-1234-5678",
  });

  const recall = await tryKnowledgeRecall("아까 저장한 그 번호 뭐야?");
  assert.ok(recall);
  assert.match(recall!.summary, /01012345678/);

  const saved = await autoSaveKnowledgeFromMessage("010-9876-5432");
  assert.equal(saved.length, 1);
  assert.equal(saved[0]?.value, "01098765432");

  const hits = await searchKnowledgeEntities({ query: "010", limit: 5 });
  assert.ok(hits.length >= 2);

  console.log("test-action-oriented: ok");
})();
