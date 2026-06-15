#!/usr/bin/env npx tsx
/**
 * CI merge gate — playbook regression score must be ≥ 95%.
 * Exit 1 on failure (blocks merge).
 */
import { assertSelfLearningGate } from "../lib/self-learning/gate-runner";

async function main() {
  const result = await assertSelfLearningGate();

  console.log(
    JSON.stringify(
      {
        status: "PASS",
        score: `${(result.score * 100).toFixed(1)}%`,
        threshold: `${(result.threshold * 100).toFixed(0)}%`,
        passed: result.passed,
        total: result.total,
        failedCases: result.failures.length,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
