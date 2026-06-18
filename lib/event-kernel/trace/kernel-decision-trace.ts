import { containsDeicticReference } from "@/lib/event-kernel/memory/collect-memory-hints";
import type {
  KernelIntentDecision,
  MemoryHints,
} from "@/lib/event-kernel/intent-kernel-system/types";
import type {
  EventKernelState,
  KernelCommitDecision,
  KernelMicroIntentKey,
} from "@/lib/event-kernel/types";

export type MemoryInfluenceFlag = "NONE" | "HINT_USED" | "IGNORED";

export type DeicticTraceStatus =
  | "NOT_ATTEMPTED"
  | "ATTEMPTED"
  | "RESOLVED"
  | "FAILED";

export type KernelDecisionTraceInput = {
  message: string;
  historyTurnCount: number;
  base: Pick<
    EventKernelState,
    "entropy" | "committedDecision" | "dominantIntent" | "signals"
  >;
  memoryHints: MemoryHints;
  kernelDecision: KernelIntentDecision;
};

export type KernelDecisionTrace = {
  input: {
    message: string;
    history_turn_count: number;
    base_entropy: number;
    base_decision: KernelCommitDecision;
    dominant_intent: KernelMicroIntentKey;
    signals: readonly string[];
  };
  kernel: {
    intent: string;
    state: KernelIntentDecision["state"];
    route: KernelIntentDecision["route"];
    confidence: number;
    canonical_query?: string;
    notes?: string;
  };
  memory: {
    candidates: Array<{ entity: string; score: number; source: string }>;
    scores: number[];
  };
  deictic: {
    status: DeicticTraceStatus;
  };
  memory_influence: MemoryInfluenceFlag;
  rationale: string;
  traced_at: string;
};

function snapshotMemoryHints(memoryHints: MemoryHints): KernelDecisionTrace["memory"] {
  return {
    candidates: memoryHints.candidates.map((item) => ({
      entity: item.entity,
      score: item.score,
      source: item.source,
    })),
    scores: [...memoryHints.scores],
  };
}

function resolveDeicticStatus(input: KernelDecisionTraceInput): DeicticTraceStatus {
  if (!containsDeicticReference(input.message)) {
    return "NOT_ATTEMPTED";
  }

  const notes = input.kernelDecision.notes ?? "";

  if (notes.startsWith("kernel_accept:")) {
    return "RESOLVED";
  }

  if (
    input.kernelDecision.state === "CLARIFY_A" &&
    (notes.startsWith("kernel_reject:") || notes === "deictic_unresolved")
  ) {
    return "FAILED";
  }

  return "ATTEMPTED";
}

function resolveMemoryInfluence(input: KernelDecisionTraceInput): MemoryInfluenceFlag {
  if (input.memoryHints.candidates.length === 0) {
    return "NONE";
  }

  const notes = input.kernelDecision.notes ?? "";
  if (notes.startsWith("kernel_accept:")) {
    return "HINT_USED";
  }

  return "IGNORED";
}

function buildRationale(input: KernelDecisionTraceInput): string {
  const parts: string[] = [];
  const notes = input.kernelDecision.notes?.trim();

  parts.push(
    `kernel=${input.kernelDecision.state}/${input.kernelDecision.route} conf=${input.kernelDecision.confidence.toFixed(2)}`
  );

  if (notes) {
    parts.push(`notes=${notes}`);
  }

  const deictic = resolveDeicticStatus(input);
  if (deictic !== "NOT_ATTEMPTED") {
    parts.push(`deictic=${deictic.toLowerCase()}`);
  }

  const influence = resolveMemoryInfluence(input);
  if (influence !== "NONE") {
    parts.push(`memory=${influence.toLowerCase()}`);
  }

  if (input.memoryHints.candidates[0]) {
    const top = input.memoryHints.candidates[0]!;
    parts.push(`top_hint=${top.entity}@${top.source}`);
  }

  return parts.join(" · ");
}

/**
 * Pure observability — generated AFTER kernel decision.
 * Does not affect routing, execution, or memory behavior.
 */
export function buildKernelDecisionTrace(
  input: KernelDecisionTraceInput,
  tracedAt: string = new Date().toISOString()
): KernelDecisionTrace {
  return {
    input: {
      message: input.message.trim(),
      history_turn_count: input.historyTurnCount,
      base_entropy: input.base.entropy,
      base_decision: input.base.committedDecision,
      dominant_intent: input.base.dominantIntent,
      signals: [...input.base.signals],
    },
    kernel: {
      intent: input.kernelDecision.intent,
      state: input.kernelDecision.state,
      route: input.kernelDecision.route,
      confidence: Number(input.kernelDecision.confidence.toFixed(2)),
      ...(input.kernelDecision.canonical_query
        ? { canonical_query: input.kernelDecision.canonical_query }
        : {}),
      ...(input.kernelDecision.notes ? { notes: input.kernelDecision.notes } : {}),
    },
    memory: snapshotMemoryHints(input.memoryHints),
    deictic: {
      status: resolveDeicticStatus(input),
    },
    memory_influence: resolveMemoryInfluence(input),
    rationale: buildRationale(input),
    traced_at: tracedAt,
  };
}

export function formatKernelDecisionTrace(trace: KernelDecisionTrace): string {
  return JSON.stringify(trace);
}

/** Internal-only sink — default no-op in production unless explicitly enabled. */
let traceSink: ((trace: KernelDecisionTrace) => void) | null = null;

export function setKernelDecisionTraceSink(
  sink: ((trace: KernelDecisionTrace) => void) | null
) {
  traceSink = sink;
}

export function emitKernelDecisionTrace(trace: KernelDecisionTrace) {
  traceSink?.(trace);
}

export function resetKernelDecisionTraceSinkForTests() {
  traceSink = null;
}
