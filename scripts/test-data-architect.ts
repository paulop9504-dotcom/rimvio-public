#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { resetKnowledgeEntityMemoryForTests } from "../lib/knowledge/knowledge-entity-db";
import { resetStreamStoreForTests } from "../lib/data-architect/persist-stream-record";
import { resetArchitectContainerMemoryForTests } from "../lib/data-architect/list-existing-containers";
import { extractKnowledgeAndStream, ruleClassifyInput } from "../lib/data-architect/rule-classify-input";
import { isDataArchitectCandidate, orchestrateDataArchitect } from "../lib/data-architect/orchestrate-data-architect";
import { ingestData } from "../lib/data-architect/ingest-data";
import { ARCHITECT_ACTION_OPTIONS } from "../lib/data-architect/ingest-decision-options";
import { listExistingContainers } from "../lib/data-architect/list-existing-containers";
import { buildDataArchitectSystemPrompt, buildDataArchitectUserPayload } from "../lib/data-architect/data-architect-prompt";

resetKnowledgeEntityMemoryForTests();
resetStreamStoreForTests();
resetArchitectContainerMemoryForTests();

async function main() {
  assert.equal(ARCHITECT_ACTION_OPTIONS.length, 3);
  assert.equal(ARCHITECT_ACTION_OPTIONS[0]!.id, "APPEND");

  const containers = listExistingContainers();
  assert.ok(containers.length >= 4);

  const payload = buildDataArchitectUserPayload({ containers, rawInput: "테스트 메모" });
  assert.match(payload, /\[EXISTING CONTAINERS\]/);
  assert.match(payload, /\[INPUT DATA\]/);

  const scheduleWire = ruleClassifyInput("다음 주 화요일 팀 미팅 일정 잡아줘");
  assert.equal(scheduleWire.action, "APPEND");
  assert.equal(scheduleWire.container_id, "calendar_planner");

  const uncategorized = ruleClassifyInput("ㅇㅇ");
  assert.equal(uncategorized.action, "UNCATEGORIZED");

  const ingested = await ingestData({ rawInput: "팀 온보딩 자료 모음 — 슬랙 #onboarding" });
  assert.equal(ingested.action, "CREATE_NEW");

  const result = await orchestrateDataArchitect({
    rawInput: "랜덤 메모 https://example.com/x",
    message: "이거 분류해줘",
  });
  assert.ok(result?.dataArchitect);
  assert.equal(result!.pendingConfirm, result!.dataArchitect!.action === "UNCATEGORIZED");

  assert.match(buildDataArchitectSystemPrompt(), /APPEND.*CREATE_NEW.*UNCATEGORIZED/s);

  console.log("test-data-architect: ok");
}

void main();
