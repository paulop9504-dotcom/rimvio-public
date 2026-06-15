import type { OrchestratorResult } from "@/lib/action-chat/orchestrator-types";
import type {
  EventKernelAction,
  EventKernelFrame,
  EventKernelState,
  KernelCommitDecision,
  KernelMicroIntentKey,
} from "@/lib/event-kernel/types";
import {
  serializeEventKernelOutput,
  type EventKernelStrictOutput,
} from "@/lib/event-kernel/serialize-event-kernel-output";
import {
  buildKernelUiRenderInput,
  type KernelUiRenderInput,
} from "@/lib/event-kernel/render-kernel-ui";
import { dominantMicroIntent } from "@/lib/event-kernel/types";

export type KernelExecutionDisposition = "terminal" | "delegate" | "hold";

export type KernelExecutionHint =
  | "search"
  | "meal_recommendation"
  | "pipeline"
  | "shift"
  | "continue"
  | "ack"
  | "close"
  | "options"
  | "clarify"
  | "missing_slot"
  | "calendar_commit"
  | "hold";

export type KernelExecutionOutcome = {
  disposition: KernelExecutionDisposition;
  hint: KernelExecutionHint;
  result: OrchestratorResult | null;
};

/** Runtime attachment — actions/meta only; not used to re-decide intent. */
export type KernelExecutionRuntime = {
  actions: EventKernelAction[];
  turnPressure: number;
  frame: EventKernelFrame;
};

const VALID_DECISIONS: KernelCommitDecision[] = [
  "DIRECT_ACTION",
  "OPTIONS",
  "CLARIFY",
];

const SAFETY_CLARIFY_HINT = "무엇을 도와드릴까요?";

/** §3 CASE 2 — max 3 bullet options from pre-built actions. */
export function formatOptionsExecutionResponse(actions: EventKernelAction[]): string {
  const lines = actions.slice(0, 3).map((action) => `- ${action.label}`);
  return lines.join("\n");
}

function dominantFromWire(wire: EventKernelStrictOutput): KernelMicroIntentKey {
  return dominantMicroIntent(wire.micro_intent);
}

function wireActions(
  actions: EventKernelAction[],
  wire: EventKernelStrictOutput
): OrchestratorResult["actions"] {
  return actions.slice(0, 3).map((action) => ({
    id: action.id,
    kind: "open" as const,
    label: action.label,
    href: "#",
    payload: {
      kernelAction: action.kind,
      kernelDecision: wire.decision,
    },
  }));
}

function buildOrchestratorMeta(
  wire: EventKernelStrictOutput,
  runtime: KernelExecutionRuntime,
  dominant: KernelMicroIntentKey,
  summary: string
): OrchestratorResult["meta"] {
  const kernelUi: KernelUiRenderInput = buildKernelUiRenderInput(
    {
      frame: { ...runtime.frame, intent_hint: wire.frame.intent_hint },
      microIntentDistribution: wire.micro_intent,
      entropy: wire.entropy,
      committedDecision: wire.decision,
      dominantIntent: dominant,
      turnPressure: runtime.turnPressure,
      actions: runtime.actions,
      responseHint: wire.response_hint,
      signals: [],
      history: [],
    },
    summary,
    summary
  );

  return {
    intent_type: "CONTINUE",
    requires_context_switch: dominant === "SHIFT",
    kernel_entropy: wire.entropy,
    kernel_decision: wire.decision,
    micro_intent: dominant === "QUERY" ? "DIRECT_QUERY" : dominant,
    micro_confidence: wire.micro_intent[dominant],
    stability_score: 1 - wire.entropy,
    turn_pressure: runtime.turnPressure,
    kernel_ui: kernelUi,
  };
}

function resolveTerminalHint(
  wire: EventKernelStrictOutput,
  dominant: KernelMicroIntentKey
): KernelExecutionHint {
  if (wire.decision === "OPTIONS") {
    return "options";
  }
  if (wire.decision === "CLARIFY") {
    return "clarify";
  }
  if (dominant === "CLOSE") {
    return "close";
  }
  if (dominant === "ACK") {
    return "ack";
  }
  return "hold";
}

function terminalResult(
  wire: EventKernelStrictOutput,
  runtime: KernelExecutionRuntime,
  dominant: KernelMicroIntentKey,
  summary: string,
  actions: EventKernelAction[] = []
): KernelExecutionOutcome {
  return {
    disposition:
      actions.length === 0 && dominant === "PASSIVE" ? "hold" : "terminal",
    hint: resolveTerminalHint(wire, dominant),
    result: {
      summary,
      actions: wireActions(actions, wire),
      source: "rules",
      confidence: 1 - wire.entropy,
      metadata: {
        intent: "ACTION",
        trust_level_adjustment: "NONE",
      },
      meta: buildOrchestratorMeta(wire, runtime, dominant, summary),
    },
  };
}

function delegateOutcome(hint: KernelExecutionHint): KernelExecutionOutcome {
  return {
    disposition: "delegate",
    hint,
    result: null,
  };
}

/** Contract-bound execution delegate (e.g. meal recommendation flow). */
export function delegateKernelExecution(
  hint: KernelExecutionHint
): KernelExecutionOutcome {
  return delegateOutcome(hint);
}

function normalizeDecision(decision: KernelCommitDecision | undefined): KernelCommitDecision {
  if (decision && VALID_DECISIONS.includes(decision)) {
    return decision;
  }
  return "CLARIFY";
}

function executionSummary(wire: EventKernelStrictOutput, fallback = ""): string {
  return wire.response_hint.trim() || fallback;
}

/**
 * Execution Orchestrator — pure execution (§1–§7).
 * Reads Kernel wire only. Does NOT re-classify or recompute entropy.
 */
export function executeKernelWire(
  wire: EventKernelStrictOutput,
  runtime: KernelExecutionRuntime
): KernelExecutionOutcome {
  const decision = normalizeDecision(wire.decision);
  const dominant = dominantFromWire(wire);

  if (decision !== wire.decision) {
    const safetyWire: EventKernelStrictOutput = {
      ...wire,
      decision: "CLARIFY",
      response_hint: SAFETY_CLARIFY_HINT,
    };
    return terminalResult(safetyWire, runtime, dominant, SAFETY_CLARIFY_HINT);
  }

  switch (decision) {
    case "CLARIFY":
      return terminalResult(
        wire,
        runtime,
        dominant,
        executionSummary(wire, SAFETY_CLARIFY_HINT)
      );

    case "OPTIONS":
      return terminalResult(
        wire,
        runtime,
        dominant,
        executionSummary(wire, formatOptionsExecutionResponse(runtime.actions)),
        runtime.actions
      );

    case "DIRECT_ACTION":
      switch (dominant) {
        case "QUERY":
          return delegateOutcome("search");
        case "SHIFT":
          return delegateOutcome("shift");
        case "CONTINUE":
          return delegateOutcome("continue");
        case "ACK":
        case "CLOSE":
        case "PASSIVE":
          return terminalResult(wire, runtime, dominant, executionSummary(wire));
        default:
          return delegateOutcome("pipeline");
      }

    default:
      return terminalResult(wire, runtime, dominant, SAFETY_CLARIFY_HINT);
  }
}

/** Adapter — full kernel state → wire + runtime (no re-decision). */
export function executeKernelDecision(
  kernel: EventKernelState
): KernelExecutionOutcome {
  return executeKernelWire(serializeEventKernelOutput(kernel), {
    actions: kernel.actions,
    turnPressure: kernel.turnPressure,
    frame: kernel.frame,
  });
}

/** Adapter — strict Kernel wire + runtime state. */
export function executeKernelFromStrictOutput(
  wire: EventKernelStrictOutput,
  state: EventKernelState
): KernelExecutionOutcome {
  return executeKernelWire(wire, {
    actions: state.actions,
    turnPressure: state.turnPressure,
    frame: state.frame,
  });
}

/** True when execution returns immediately (no pipeline delegate). */
export function kernelExecutionIsTerminal(outcome: KernelExecutionOutcome): boolean {
  return outcome.disposition === "terminal" || outcome.disposition === "hold";
}
