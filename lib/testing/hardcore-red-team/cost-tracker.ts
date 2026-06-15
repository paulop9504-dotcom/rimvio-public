import type { CostFlag, TokenCostMetrics } from "@/lib/testing/hardcore-red-team/types";

/** ~4 chars per token for Korean-heavy text (heuristic). */
const CHARS_PER_TOKEN = 4;

/** gpt-4o-mini blended rate — conservative upper bound for red-team budgeting. */
const USD_PER_1K_TOKENS = 0.003;

export function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / CHARS_PER_TOKEN));
}

export function computeCostMetrics(input: {
  inputText: string;
  outputText: string;
  intentCount: number;
  routingDecisionCount: number;
  batchSize?: number;
  recursionDepth?: number;
}): TokenCostMetrics {
  const inputTokens = estimateTokens(input.inputText);
  const outputTokens = estimateTokens(input.outputText);
  const totalTokens = inputTokens + outputTokens;
  const estimatedCostUsd = (totalTokens / 1000) * USD_PER_1K_TOKENS;
  const intentCount = Math.max(1, input.intentCount);
  const routingCount = Math.max(1, input.routingDecisionCount);

  let costFlag: CostFlag = "OK";
  if (totalTokens >= 10_000) costFlag = "OVERLOAD";
  else if (totalTokens >= 5_000) costFlag = "HIGH_COST";
  if ((input.recursionDepth ?? 0) > 3) costFlag = "LOOP_RISK";
  if ((input.batchSize ?? 0) > 20) costFlag = "COST_SPIKE";

  return {
    inputTokens,
    outputTokens,
    totalTokens,
    estimatedCostUsd,
    costPerIntent: estimatedCostUsd / intentCount,
    costPerRoutingDecision: estimatedCostUsd / routingCount,
    costFlag,
  };
}

export function collectCostWarnings(metrics: TokenCostMetrics[]): string[] {
  const warnings: string[] = [];
  const high = metrics.filter((m) => m.costFlag === "HIGH_COST").length;
  const overload = metrics.filter((m) => m.costFlag === "OVERLOAD").length;
  const loop = metrics.filter((m) => m.totalTokens > 0 && m.costFlag === "LOOP_RISK").length;

  if (overload > 0) {
    warnings.push(`OVERLOAD FLAG: ${overload} case(s) >= 10k tokens`);
  }
  if (high > 0) {
    warnings.push(`HIGH COST FLAG: ${high} case(s) >= 5k tokens`);
  }
  if (loop > 0) {
    warnings.push(`INFINITE LOOP RISK: recursion > 3 on ${loop} case(s)`);
  }
  if (metrics.length > 20) {
    warnings.push(`COST SPIKE ZONE: adversarial batch = ${metrics.length} cases`);
  }
  return warnings;
}
