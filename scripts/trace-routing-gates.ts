#!/usr/bin/env npx tsx
import { orchestrateEntityQuickPick } from "../lib/context-resolver/discovery/orchestrate-entity-quick-pick";
import { buildEntityActionSurface } from "../lib/event-kernel/entity/entity-action-surface";
import { isVitalityStateUtterance } from "../lib/vitality-state/classify-vitality-state-intent";
import { parseFindPlaceIntent } from "../lib/context-resolver/discovery/parse-find-place-intent";
import { buildConversationEventState } from "../lib/action-chat/conversation-event-state";
import { eventKernelOSIsTerminal } from "../lib/event-kernel";
import { inferContractAction } from "../lib/event-kernel";

const messages = ["배고파", "나 배고파", "둔산동 맛집", "쿠우쿠우"];

for (const message of messages) {
  const eventState = buildConversationEventState({ message, history: [] });
  const os = eventState.os;
  console.log("\n===", message, "===");
  console.log("vitalityGate:", isVitalityStateUtterance(message));
  console.log("entitySurface:", buildEntityActionSurface(message)?.lead ?? null);
  console.log("entityQuickPick:", orchestrateEntityQuickPick(message)?.summary?.slice(0, 80) ?? null);
  console.log("findPlace:", parseFindPlaceIntent(message));
  console.log("contractAction:", inferContractAction(message));
  console.log("kernelDecision:", eventState.os.kernel.committedDecision);
  console.log("executionPlan:", os.executionPlan.action);
  console.log("terminal:", eventKernelOSIsTerminal(os));
  console.log("orchestratorResult:", os.orchestratorResult?.summary?.slice(0, 80) ?? null);
  console.log("output.hint:", os.output.hint);
  console.log("output.summary:", os.output.summary?.slice(0, 80));
}
