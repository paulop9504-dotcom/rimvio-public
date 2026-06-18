#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { ruleParsePlaceIngestion } from "../lib/data-ingestion/rule-parse-place";
import {
  buildActionsFromPlaceSchema,
  persistPlaceIngestion,
  resetPlaceContainerStoreForTests,
} from "../lib/data-ingestion/persist-place-container";
import { resetKnowledgeEntityMemoryForTests } from "../lib/knowledge/knowledge-entity-db";

const SAMPLE = `
쿠우쿠우 도안점
대전광역시 유성구 도안동 123
050-1234-5678
영업중 11:00 - 22:00
https://example.com/kuukou
주차 가능 · 예약 가능
`.trim();

resetPlaceContainerStoreForTests();
resetKnowledgeEntityMemoryForTests();

async function main() {
  const schema = ruleParsePlaceIngestion(SAMPLE);
  assert.ok(schema);
  assert.match(schema!.name ?? "", /쿠우쿠우/);
  assert.ok(schema!.address);
  assert.ok(schema!.phone);
  assert.equal(schema!.opening_hours.status, "open");
  assert.ok(schema!.features.length >= 1);

  const actions = buildActionsFromPlaceSchema(schema!);
  assert.ok(actions.length >= 2);
  assert.ok(actions.some((action) => /지도|네비|map/i.test(action.label)));

  const persisted = await persistPlaceIngestion({ schema: schema!, sourceText: SAMPLE });
  assert.ok(persisted.container.id.startsWith("place-"));
  assert.ok(persisted.entities.length >= 2);

  console.log("test-data-ingestion: ok");
}

void main();
