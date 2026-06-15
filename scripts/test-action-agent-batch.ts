#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  actionAgentBatchToItems,
  isActionAgentBatchCandidate,
  processActionAgentBatch,
} from "../lib/action-chat/action-agent-batch";
import { normalizeActionAgentPhone } from "../lib/action-chat/action-agent-normalize";
import { tryActionAgentBatch } from "../lib/action-chat/orchestrate-action-agent-batch";
import { orchestrateByRules } from "../lib/action-chat/rule-orchestrator";

const QOOQOO_DUMP = `
쿠우쿠우 도안점
펼쳐보기
대전 서구 도안동로 10 4층
042-544-1162
영업 중 · 11:00 - 22:00
http://www.qooqoo.co.kr/
`.trim();

const MIXED_SCHEDULE = `
내일 오후 3시 강남역 스타벅스 미팅
010-9876-5432
`.trim();

assert.ok(isActionAgentBatchCandidate(QOOQOO_DUMP));
assert.ok(isActionAgentBatchCandidate(MIXED_SCHEDULE));
assert.equal(isActionAgentBatchCandidate("강남역 스타벅스"), false);

const qooqooWire = processActionAgentBatch(QOOQOO_DUMP, { referenceDate: "2026-05-30" });
assert.ok(qooqooWire);
assert.ok(qooqooWire!.results.length >= 2);

const phoneTask = qooqooWire!.results.find((task) => task.type === "PHONE");
assert.ok(phoneTask);
assert.equal(normalizeActionAgentPhone(phoneTask!.extracted_data.phone), "0425441162");

const addressTask = qooqooWire!.results.find((task) => task.type === "ADDRESS");
assert.ok(addressTask);
assert.equal(addressTask!.extracted_data.address, "대전 서구 도안동로 10");
assert.ok(addressTask!.actions.some((action) => action.label === "네비게이션"));

const scheduleWire = processActionAgentBatch(MIXED_SCHEDULE, { referenceDate: "2026-05-30" });
assert.ok(scheduleWire);
assert.ok(scheduleWire!.results.some((task) => task.type === "PHONE"));
assert.ok(scheduleWire!.results.some((task) => task.type === "DATETIME"));
const datetimeTask = scheduleWire!.results.find((task) => task.type === "DATETIME");
assert.match(datetimeTask!.extracted_data.datetime ?? "", /^2026-05-31T15:/);

const batchItems = actionAgentBatchToItems(qooqooWire!);
assert.ok(batchItems.every((item) => item.actions.length > 0));
assert.ok(batchItems.every((item) => item.summary.length > 0));

const orchestrated = tryActionAgentBatch({
  message: QOOQOO_DUMP,
  referenceDate: "2026-05-30",
});
assert.ok(orchestrated);
assert.ok(orchestrated!.batchResults && orchestrated!.batchResults.length >= 2);
assert.match(orchestrated!.summary, /건 추출/);

const rules = orchestrateByRules({ message: QOOQOO_DUMP });
assert.ok(rules.batchResults && rules.batchResults.length >= 2);
assert.ok(rules.batchResults.some((item) => item.type === "PHONE"));
assert.ok(rules.batchResults.some((item) => item.type === "ADDRESS"));

console.log("test-action-agent-batch: ok");
