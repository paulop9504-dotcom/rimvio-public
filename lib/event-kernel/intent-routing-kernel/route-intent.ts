import type { OrchestrateHistoryTurn } from "@/lib/action-chat/orchestrator-types";
import type { EventKernelMemoryState } from "@/lib/event-kernel/memory/types";
import { collectMemoryHints } from "@/lib/event-kernel/memory/collect-memory-hints";
import { decideKernelIntent } from "@/lib/event-kernel/decide-kernel-intent";
import type { EventKernelState } from "@/lib/event-kernel/types";
import type { IntentRoutingDecision } from "@/lib/event-kernel/intent-routing-kernel/types";

export type RouteIntentKernelInput = {
  message: string;
  history?: OrchestrateHistoryTurn[];
  kernel: EventKernelState;
  memory?: EventKernelMemoryState | null;
  linkTitle?: string | null;
};

/** @deprecated Use decideKernelIntent + composeIntentKernelOutput */
export function routeIntentKernel(input: RouteIntentKernelInput): IntentRoutingDecision {
  const memoryHints = collectMemoryHints({
    message: input.message,
    history: input.history,
    memory: input.memory,
    linkTitle: input.linkTitle,
    frameEntities: input.kernel.frame.entities,
  });

  const decision = decideKernelIntent({
    message: input.message,
    history: input.history,
    base: input.kernel,
    memoryHints,
  });

  return {
    intent: decision.intent,
    state: decision.state === "DIRECT_ACTION" ? "QUERY" : decision.state,
    route: decision.route,
    confidence: decision.confidence,
    notes: decision.notes ?? "",
    canonical_query: decision.canonical_query,
  };
}

/** @deprecated */
export function formatIntentRoutingDecision(decision: IntentRoutingDecision): string {
  return JSON.stringify(
    {
      intent: decision.intent,
      state: decision.state,
      route: decision.route,
      confidence: Number(decision.confidence.toFixed(2)),
      notes: decision.notes,
      ...(decision.canonical_query ? { canonical_query: decision.canonical_query } : {}),
    },
    null,
    0
  );
}
