#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { appendLiveTurn, getLiveTurnLogPath } from "../lib/self-learning/append-live-turn";
import { observeAndLogLiveTurn } from "../lib/self-learning/observe-and-log-turn";
import { runRegressionGate } from "../lib/self-learning/anti-drift-gate";

const dir = mkdtempSync(join(tmpdir(), "live-turn-"));
const logPath = join(dir, "live-turns.jsonl");
process.env.RIMVIO_LIVE_TURN_LOG = logPath;

const input = appendLiveTurn({
  stage: "input",
  userMessage: "배고파",
  source: "client",
});

assert.equal(input.type, "live_turn");
assert.equal(input.stage, "input");

const output = observeAndLogLiveTurn({
  stage: "output",
  userMessage: "배고파",
  assistantSummary: "근처 맛집 찾아볼게요.",
  metadata: {
    routing_patch: "MEAL",
    abstraction_level: "L2",
  },
  source: "server",
});

assert.equal(output.isFailure, false);
assert.match(readFileSync(logPath, "utf8"), /live_turn/u);

async function main() {
  const gate = await runRegressionGate({ threshold: 0.5, bankIndex: 0 });
  assert.ok(gate.total >= 10);
  assert.ok(gate.successRate >= 0.5);
  console.log("test-live-turn-hook: ok");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
