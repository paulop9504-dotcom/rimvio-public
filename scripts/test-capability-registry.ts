#!/usr/bin/env npx tsx
import assert from "node:assert/strict";

import {
  INITIAL_CAPABILITY_IDS,
  assertCatalogCompleteness,
  dispatchCapability,
  getCapability,
  listCapabilities,
  resolveCapabilityProvider,
} from "@/lib/capability-registry";
import {
  resetExecutionDispatcherForTests,
  resetExecutionHistoryForTests,
  resetExecutionQueueForTests,
  runExecutionJob,
} from "@/lib/execution";
import {
  FIXTURE_NAVIGATE_OSAKA,
  FIXTURE_BOOK_FLIGHT,
} from "@/lib/capability-registry/capability-test-fixtures";

const REQUIRED_KEYS = [
  "id",
  "name",
  "description",
  "category",
  "availability",
  "priority",
  "executionMode",
  "supportedPlatforms",
  "inputSchema",
  "outputSchema",
  "providers",
] as const;

function resetExecution() {
  resetExecutionQueueForTests();
  resetExecutionHistoryForTests();
  resetExecutionDispatcherForTests();
}

function testContractStability() {
  assertCatalogCompleteness();
  const sample = getCapability("NAVIGATE");
  assert.ok(sample);
  for (const key of REQUIRED_KEYS) {
    assert.ok(key in sample, `missing ${key}`);
  }
  assert.ok(sample.providers.length >= 2);
}

function testCatalogCompleteness() {
  const ids = listCapabilities().map((row) => row.id);
  for (const id of INITIAL_CAPABILITY_IDS) {
    assert.ok(ids.includes(id), `catalog missing ${id}`);
  }
}

function testProviderResolution() {
  const resolved = resolveCapabilityProvider({ capabilityId: "NAVIGATE" });
  assert.ok(resolved);
  assert.equal(resolved.capabilityId, "NAVIGATE");
}

function testDispatcherEnqueues() {
  resetExecution();
  const nav = dispatchCapability(FIXTURE_NAVIGATE_OSAKA);
  assert.equal(nav.ok, true);
  if (nav.ok) {
    assert.ok(nav.executionId.startsWith("exec-"));
    const done = runExecutionJob(nav.executionId);
    assert.equal(done?.status, "completed");
    assert.ok(done?.result?.uri);
  }

  const flight = dispatchCapability(FIXTURE_BOOK_FLIGHT);
  assert.equal(flight.ok, true);

  const bad = dispatchCapability({ capabilityId: "NAVIGATE", inputs: {} });
  assert.equal(bad.ok, false);
}

testContractStability();
testCatalogCompleteness();
testProviderResolution();
testDispatcherEnqueues();

console.log("test-capability-registry: ok");
