#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import {
  ACTION_REGISTRY_SCHEMA_VERSION,
  buildActionRegistryCatalog,
  getRegisteredActionIds,
  LOCKED_EVENT_CATEGORIES,
  LOCKED_EVENT_LIFECYCLES,
  LOCKED_EVENT_SCHEMA_VERSION,
  LOCKED_EVENT_SOURCES,
} from "../lib/data-model";
import { getActionIntentDefinition } from "../lib/action-dispatcher/registry";

const catalog = buildActionRegistryCatalog();
assert.ok(catalog.length >= 8, "action registry should list core intents");
assert.equal(ACTION_REGISTRY_SCHEMA_VERSION, "action-intent-registry.v1");

for (const entry of catalog) {
  const definition = getActionIntentDefinition(entry.id);
  assert.ok(definition, `missing registry definition for ${entry.id}`);
  assert.deepEqual([...definition.params].sort(), [...entry.params].sort());
}

const ids = getRegisteredActionIds();
assert.equal(ids.length, catalog.length);
assert.ok(ids.includes("NAVIGATE"));
assert.ok(ids.includes("TAXI_CALL"));

assert.equal(LOCKED_EVENT_SCHEMA_VERSION, "event-candidate.v1");
assert.equal(LOCKED_EVENT_CATEGORIES.length, 7);
assert.equal(LOCKED_EVENT_SOURCES.length, 3);
assert.equal(LOCKED_EVENT_LIFECYCLES.length, 7);

console.log("test-data-model-catalog: ok");
