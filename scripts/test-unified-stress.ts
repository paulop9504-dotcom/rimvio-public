#!/usr/bin/env npx tsx
/**
 * INTENT + ABSTRACTION + SCHEDULING + QA STRESS TEST SYSTEM
 *
 * Four roles in one runner:
 * - Intent Expansion Engine
 * - Abstraction Layer Analyzer
 * - Adversarial QA Stress Tester
 * - Scheduling Conflict Resolver
 */
import { isOpenAiConfigured } from "../lib/llm/openai-config";
import { consolidateUnifiedStress } from "../lib/testing/unified-stress/consolidate";
import {
  evaluateUnifiedStressRun,
  runUnifiedStressCase,
} from "../lib/testing/unified-stress/evaluate-unified-stress";
import {
  formatConsolidationSummary,
  formatUnifiedStressReport,
} from "../lib/testing/unified-stress/format-unified-stress-report";
import { UNIFIED_STRESS_CASES } from "../lib/testing/unified-stress/unified-stress-banks";

const masterContext = {
  currentDate: "2026-06-02",
  trustLevel: "L1" as const,
  existingSchedule: [],
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
  console.log(`OpenAI configured: ${isOpenAiConfigured()}`);
  console.log("--- UNIFIED STRESS: Intent + Abstraction + Scheduling + QA ---\n");

  const runs = [];
  let failCount = 0;

  for (const testCase of UNIFIED_STRESS_CASES) {
    const run = await runUnifiedStressCase(testCase, masterContext);
    const evaluation = evaluateUnifiedStressRun(run);
    const effectivePass = evaluation.pass;
    if (!effectivePass) failCount += 1;

    console.log(
      formatUnifiedStressReport({
        run: { ...run, pass: effectivePass },
      })
    );
    console.log("");
    runs.push({ ...run, pass: effectivePass });
  }

  const consolidation = consolidateUnifiedStress(runs);
  console.log(formatConsolidationSummary(consolidation));

  if (failCount > 0) {
    console.error(`\nUNIFIED_STRESS_SUMMARY: ${runs.length - failCount}/${runs.length} PASS`);
    console.error(
      "Note: FAIL cases document routing/abstraction gaps — see Weakness Map above."
    );
    if (process.env.RIMVIO_UNIFIED_STRESS_REPORT_ONLY === "1") {
      console.log("RIMVIO_UNIFIED_STRESS_REPORT_ONLY=1 — exiting 0 (report mode)");
      return;
    }
    process.exit(1);
  }

  console.log(`\nUNIFIED_STRESS_SUMMARY: ${runs.length}/${runs.length} PASS`);
  console.log("test-unified-stress: ok");
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
