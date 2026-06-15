import type { AdaptiveQaEvaluation } from "@/lib/testing/deos-adaptive-qa/evaluate-adaptive-qa";
import type { AdaptiveSimulation } from "@/lib/testing/deos-adaptive-qa/project-orchestrator-surface";
import { failedCheckSummaries } from "@/lib/testing/deos-adaptive-qa/evaluate-adaptive-qa";

export type AdaptiveQaReport = {
  testId: number;
  input: string;
  category: string;
  decision: string;
  plugin: string[];
  outputSummary: string;
  qaScore: number;
  status: "PASS" | "FAIL";
  failureReason?: string;
  mutatedInput?: string;
  retryResult?: string;
};

export function formatAdaptiveQaReport(
  testId: number,
  sim: AdaptiveSimulation,
  evaluation: AdaptiveQaEvaluation,
  extras?: {
    mutatedInput?: string;
    retryEvaluation?: AdaptiveQaEvaluation;
  }
): string {
  const report: AdaptiveQaReport = {
    testId,
    input: sim.input,
    category: sim.category,
    decision: sim.projectedKind,
    plugin: sim.plugins,
    outputSummary: sim.outputSummary,
    qaScore: evaluation.score,
    status: evaluation.pass ? "PASS" : "FAIL",
  };

  const lines = [
    `TEST_ID: ${report.testId}`,
    `INPUT: "${report.input}"`,
    `CATEGORY: ${report.category}`,
    `DECISION: ${report.decision}`,
    `PLUGIN: [${report.plugin.join(", ")}]`,
    `OUTPUT_SUMMARY: "${report.outputSummary}"`,
    `QA_SCORE: ${report.qaScore}/10`,
    `STATUS: ${report.status}`,
  ];

  if (!evaluation.pass) {
    lines.push(`→ FAILURE_REASON: ${failedCheckSummaries(evaluation).join("; ")}`);
    if (extras?.mutatedInput) {
      lines.push(`→ MUTATED_INPUT: "${extras.mutatedInput}"`);
    }
    if (extras?.retryEvaluation) {
      lines.push(
        `→ RETRY_RESULT: ${extras.retryEvaluation.pass ? "PASS" : "FAIL"} ${extras.retryEvaluation.score}/10`
      );
    }
  }

  return lines.join("\n");
}

export function formatAdaptiveQaSummary(results: AdaptiveQaReport[]): string {
  const passed = results.filter((result) => result.status === "PASS").length;
  return `ADAPTIVE_QA_SUMMARY: ${passed}/${results.length} PASS`;
}
