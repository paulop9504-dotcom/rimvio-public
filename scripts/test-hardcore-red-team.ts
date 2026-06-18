#!/usr/bin/env npx tsx
/**
 * HARDCORE QA STRESS TEST — Intent OS Red Team (Production Breaker)
 *
 * Goal: expose breakage, misroute, over-inference, omission, schedule conflict failure.
 * NOT a pass/fail gate — a breakage discovery system.
 */
import { isOpenAiConfigured } from "../lib/llm/openai-config";
import { ALL_HARDCORE_CASES } from "../lib/testing/hardcore-red-team/adversarial-sets";
import { aggregateHardcoreBatch } from "../lib/testing/hardcore-red-team/aggregate-batch";
import {
  appendHardcoreBatchSummary,
  appendHardcoreExecutionLog,
  getHardcoreLogPath,
} from "../lib/testing/hardcore-red-team/append-execution-log";
import {
  formatHardcoreBatchSummary,
  formatHardcoreTestEntry,
} from "../lib/testing/hardcore-red-team/format-hardcore-log";
import { runHardcoreRedTeamCase } from "../lib/testing/hardcore-red-team/run-hardcore-case";
import { BUSY_SCHEDULE_FIXTURE } from "../lib/testing/hardcore-red-team/adversarial-sets";

const masterContext = {
  currentDate: "2026-06-02",
  trustLevel: "L1" as const,
  existingSchedule: BUSY_SCHEDULE_FIXTURE,
  allReminders: [],
  userGoals: [],
  activitySources: [],
  conversationMemories: [],
  activeContainers: [],
  activeChains: [],
  activeChain: null,
  userDefinedActions: [],
  mapApp: "kakao" as const,
};

async function main() {
  const logPath = getHardcoreLogPath();
  console.log("=== HARDCORE RED TEAM — PRODUCTION BREAKER ===");
  console.log(`OpenAI: ${isOpenAiConfigured()} | cases: ${ALL_HARDCORE_CASES.length}`);
  console.log(`Log: ${logPath}\n`);

  const entries = [];

  for (const testCase of ALL_HARDCORE_CASES) {
    const entry = await runHardcoreRedTeamCase(testCase, masterContext);
    entries.push(entry);
    appendHardcoreExecutionLog(entry, logPath);
    console.log(formatHardcoreTestEntry(entry));
  }

  const summary = aggregateHardcoreBatch(entries);
  appendHardcoreBatchSummary(summary, logPath);
  console.log(formatHardcoreBatchSummary(summary));

  console.log(`\nHARDCORE_RED_TEAM: ${entries.filter((e) => e.failure.isFailure).length}/${entries.length} BREAKAGE DETECTED`);
  console.log(`Log written: ${logPath}`);
  console.log("test-hardcore-red-team: ok");
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
