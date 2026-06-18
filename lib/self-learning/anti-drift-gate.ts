import { runOrchestratorPipeline } from "@/lib/action-chat/orchestrator/run-orchestrator-pipeline";
import {
  ROUTING_WORD_BANKS,
  pickRoundUtterances,
  type PlaybookCategoryId,
} from "@/lib/testing/routing-playbook-banks";
import { evaluatePlaybookCategory } from "@/lib/testing/evaluate-playbook-category";
import type { RegressionCaseResult, RegressionGateResult } from "@/lib/self-learning/types";

export const SUCCESS_THRESHOLD = 0.95;

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

/**
 * Anti-drift gate — fixed regression sample, no random updates.
 * Full `npm run test:playbook` remains the release gate; this is the loop check.
 */
export async function runRegressionGate(input?: {
  threshold?: number;
  bankIndex?: number;
}): Promise<RegressionGateResult> {
  const threshold = input?.threshold ?? SUCCESS_THRESHOLD;
  const bank = ROUTING_WORD_BANKS[input?.bankIndex ?? 0]!;
  const utterances = pickRoundUtterances(bank);
  const categories = Object.keys(utterances).map(Number) as PlaybookCategoryId[];

  const caseResults: RegressionCaseResult[] = [];

  for (const category of categories) {
    const message = utterances[category];
    const result = await runOrchestratorPipeline({ message, masterContext });
    const check = evaluatePlaybookCategory(category, message, result);
    caseResults.push({
      message,
      ok: check.ok,
      detail: check.detail,
    });
  }

  const passed = caseResults.filter((row) => row.ok).length;
  const total = caseResults.length;
  const successRate = total === 0 ? 1 : passed / total;

  return {
    total,
    passed,
    successRate,
    threshold,
    accepted: successRate >= threshold,
    failures: caseResults.filter((row) => !row.ok),
  };
}

/** All playbook banks — CI / nightly regression gate. */
export async function runFullRegressionGate(input?: {
  threshold?: number;
}): Promise<RegressionGateResult> {
  const threshold = input?.threshold ?? SUCCESS_THRESHOLD;
  const caseResults: RegressionCaseResult[] = [];

  for (let bankIndex = 0; bankIndex < ROUTING_WORD_BANKS.length; bankIndex += 1) {
    const bank = ROUTING_WORD_BANKS[bankIndex]!;
    const utterances = pickRoundUtterances(bank);
    const categories = Object.keys(utterances).map(Number) as PlaybookCategoryId[];

    for (const category of categories) {
      const message = utterances[category];
      const result = await runOrchestratorPipeline({ message, masterContext });
      const check = evaluatePlaybookCategory(category, message, result);
      caseResults.push({
        message: `[${bank.id}] ${message}`,
        ok: check.ok,
        detail: check.detail,
      });
    }
  }

  const passed = caseResults.filter((row) => row.ok).length;
  const total = caseResults.length;
  const successRate = total === 0 ? 1 : passed / total;

  return {
    total,
    passed,
    successRate,
    threshold,
    accepted: successRate >= threshold,
    failures: caseResults.filter((row) => !row.ok),
  };
}

export function mergeConflictingProposals<T extends { intentKey: string; action: string }>(
  proposals: readonly T[]
): T[] {
  const seen = new Map<string, T>();
  for (const proposal of proposals) {
    const key = `${proposal.intentKey}:${proposal.action}`;
    if (!seen.has(key)) {
      seen.set(key, proposal);
    }
  }
  return [...seen.values()];
}
