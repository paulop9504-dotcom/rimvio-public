#!/usr/bin/env npx tsx
/**
 * Playbook loop — 10 parallel checks per bank; rotate words on #10 fail or 10 consecutive fails.
 *
 * Protocol:
 * - Steps 1–9: playbook categories
 * - Step 10: stress colloquial (rotation trigger if fail)
 * - All 10 run in parallel (동시진행)
 * - consecutiveFailures must stay < 10; on 10th consecutive fail → rotate bank
 * - On step-10 fail → rotate bank, restart from step 1
 */
import { runOrchestratorPipeline } from "../lib/action-chat/orchestrator/run-orchestrator-pipeline";
import {
  ROUTING_WORD_BANKS,
  pickRoundUtterances,
  type PlaybookCategoryId,
} from "../lib/testing/routing-playbook-banks";
import {
  evaluatePlaybookCategory,
  formatCheckFailure,
  type PlaybookCheckResult,
} from "../lib/testing/evaluate-playbook-category";

const MAX_CONSECUTIVE_FAILURES = 10;
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

async function runRound(bankIndex: number) {
  const bank = ROUTING_WORD_BANKS[bankIndex]!;
  const utterances = pickRoundUtterances(bank);
  const categories = Object.keys(utterances).map(Number) as PlaybookCategoryId[];

  const pipelineResults = await Promise.all(
    categories.map(async (category) => {
      const message = utterances[category];
      const result = await runOrchestratorPipeline({ message, masterContext });
      return { category, message, result };
    })
  );

  const checks: PlaybookCheckResult[] = pipelineResults.map(({ category, message, result }) =>
    evaluatePlaybookCategory(category, message, result)
  );

  return { bank, checks };
}

async function main() {
  let consecutiveFailures = 0;
  const allFailures: string[] = [];
  let banksPassed = 0;

  for (let bankIndex = 0; bankIndex < ROUTING_WORD_BANKS.length; bankIndex++) {
    const { bank, checks } = await runRound(bankIndex);
    const failed = checks.filter((c) => !c.ok);
    const step10Failed = failed.some((c) => c.category === 10);

    if (failed.length === 0) {
      banksPassed++;
      consecutiveFailures = 0;
      console.log(`✓ ${bank.id} (${bank.label}) — 10/10`);
      continue;
    }

    for (const check of failed) {
      consecutiveFailures++;
      allFailures.push(`[${bank.id}] ${formatCheckFailure(check)}`);
    }

    console.warn(
      JSON.stringify(
        {
          status: "ROUND_FAIL",
          bank: bank.id,
          failed: failed.map(formatCheckFailure),
          consecutiveFailures,
        },
        null,
        2
      )
    );

    if (step10Failed || consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
      consecutiveFailures = 0;
      console.warn(`→ bank ${bank.id} failed (step10 or consecutive cap); next word bank…`);
    }
    continue;
  }

  if (banksPassed === ROUTING_WORD_BANKS.length) {
    console.log(
      JSON.stringify(
        {
          status: "PASS",
          banksPassed,
          totalChecks: banksPassed * 10,
          wordBanks: ROUTING_WORD_BANKS.map((b) => b.id),
        },
        null,
        2
      )
    );
    console.log("test-playbook-routing-loop: ok");
    return;
  }

  console.error(
    JSON.stringify(
      {
        status: "FAIL",
        banksPassed,
        totalBanks: ROUTING_WORD_BANKS.length,
        failures: allFailures,
      },
      null,
      2
    )
  );
  process.exit(1);
}

void main();
