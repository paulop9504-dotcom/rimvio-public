import assert from "node:assert/strict";
import { orchestrateUserMessage } from "../lib/action-chat/orchestrate-user-message";
import { buildOrchestrateFallbackResult } from "../lib/action-chat/build-orchestrate-fallback";
import { runGlobalBrainMiddleware } from "../lib/global-brain/run-global-brain-middleware";
import { masterContextFromApiPayload } from "../lib/action-chat/client-master-context";
import { resolveIntentRoute } from "../lib/action-chat/intent-router";

async function main() {
  const CASES = [
    "밖에 나가야함",
    "오늘 16시 배달일정",
    "2026-06-03 (수) 일정들\n09:00 핵심 업무 [Apex]\n10:30 휴식 [Haven]",
  ];

  for (const message of CASES) {
    const result = await orchestrateUserMessage({ message });
    assert.ok(result.summary?.trim(), `empty summary for: ${message}`);
  }

  const context = masterContextFromApiPayload(null);
  const route = resolveIntentRoute({ message: "밖에 나가야함" });
  const brain = await runGlobalBrainMiddleware({
    message: "밖에 나가야함",
    context,
    route,
  });
  assert.ok(brain.snapshot);

  const fallback = buildOrchestrateFallbackResult({ message: "ㅎㅇ" });
  assert.ok(fallback.summary);

  console.log("test-orchestrate-pipeline-resilience: ok");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
