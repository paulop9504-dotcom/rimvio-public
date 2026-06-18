#!/usr/bin/env npx tsx
import { runNightlyQA } from "../lib/self-learning/nightly-runner";

async function main() {
  const report = await runNightlyQA();
  if (!report.accepted) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
