import {
  runFullRegressionGate,
  SUCCESS_THRESHOLD,
} from "@/lib/self-learning/anti-drift-gate";
import type { RegressionGateResult } from "@/lib/self-learning/types";

export type SelfLearningGateResult = RegressionGateResult & {
  score: number;
};

/**
 * CI merge gate — exits non-zero when score < threshold (default 95%).
 */
export async function runSelfLearningGate(input?: {
  threshold?: number;
}): Promise<SelfLearningGateResult> {
  const threshold = input?.threshold ?? SUCCESS_THRESHOLD;
  const regression = await runFullRegressionGate({ threshold });

  return {
    ...regression,
    score: regression.successRate,
  };
}

export async function assertSelfLearningGate(input?: {
  threshold?: number;
}): Promise<SelfLearningGateResult> {
  const result = await runSelfLearningGate(input);
  if (!result.accepted) {
    const sample = result.failures
      .slice(0, 8)
      .map((row) => `${row.message}: ${row.detail ?? "fail"}`)
      .join("\n");
    throw new Error(
      `SELF_LEARNING_GATE_FAILED: ${(result.score * 100).toFixed(1)}% < ${(result.threshold * 100).toFixed(0)}%\n${sample}`
    );
  }
  return result;
}
