#!/usr/bin/env npx tsx
/**
 * Self-learning loop runner — collect JSONL → classify → propose → regression gate.
 *
 * Modes:
 *   CHAT MODE      — production path (use observeLiveTurn in pipeline hook)
 *   AUTO QA MODE   — npm run test:playbook / test:unified-stress / test:hardcore-red-team
 *   LEARNING LOOP  — this script (offline, no auto-apply)
 */
import { runSelfLearningLoop } from "../lib/self-learning";

async function main() {
  const withRegression = process.argv.includes("--regression");

  const report = await runSelfLearningLoop({
    runRegression: withRegression,
  });

  console.log(
    JSON.stringify(
      {
        status: report.accepted ? "ACCEPT" : "REVIEW",
        analyzedAt: report.analyzedAt,
        interactions: report.interactionCount,
        failures: report.failureCount,
        failureRate: `${(report.failureRate * 100).toFixed(1)}%`,
        byFailureKind: report.byFailureKind,
        byIntentKey: report.byIntentKey,
        proposals: report.proposals,
        regression: report.regression
          ? {
              successRate: `${(report.regression.successRate * 100).toFixed(1)}%`,
              threshold: `${(report.regression.threshold * 100).toFixed(0)}%`,
              accepted: report.regression.accepted,
              failedCases: report.regression.failures.length,
            }
          : undefined,
      },
      null,
      2
    )
  );

  if (!report.accepted && report.proposals.length > 0) {
    process.exitCode = 2;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
