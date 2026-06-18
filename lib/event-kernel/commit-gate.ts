import {
  dominantMicroIntent,
  ENTROPY_DIRECT_THRESHOLD,
  ENTROPY_OPTIONS_THRESHOLD,
  type EventKernelAction,
  type EventKernelFrame,
  type EventKernelState,
  type KernelCommitDecision,
  type KernelMicroIntentKey,
  type MicroIntentDistribution,
  KERNEL_MICRO_INTENT_KEYS,
} from "@/lib/event-kernel/types";

/** §5 STRICT — entropy thresholds only. */
export function resolveCommitDecision(entropy: number): KernelCommitDecision {
  if (entropy < ENTROPY_DIRECT_THRESHOLD) {
    return "DIRECT_ACTION";
  }
  if (entropy < ENTROPY_OPTIONS_THRESHOLD) {
    return "OPTIONS";
  }
  return "CLARIFY";
}

function entityLabel(frame: EventKernelFrame): string {
  return frame.entities[0] ?? frame.context ?? "이 주제";
}

export function buildKernelActions(input: {
  decision: KernelCommitDecision;
  dominant: KernelMicroIntentKey;
  frame: EventKernelFrame;
  distribution: MicroIntentDistribution;
}): EventKernelAction[] {
  const { decision, dominant, frame, distribution } = input;
  const label = entityLabel(frame);

  if (decision === "CLARIFY") {
    return [];
  }

  if (decision === "OPTIONS") {
    const options: EventKernelAction[] = [];
    const ranked = (Object.entries(distribution) as Array<[KernelMicroIntentKey, number]>)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    for (const [intent, prob] of ranked) {
      if (prob < 0.12) {
        continue;
      }
      if (intent === "QUERY") {
        options.push({
          id: "opt-query",
          label: `${label} 정보 검색`,
          kind: "search",
        });
      } else if (intent === "CONTINUE") {
        options.push({
          id: "opt-continue",
          label: "이어서 설명",
          kind: "continue",
        });
      } else if (intent === "SHIFT") {
        options.push({
          id: "opt-shift",
          label: "다른 주제로 전환",
          kind: "shift",
        });
      } else if (intent === "CLOSE") {
        options.push({
          id: "opt-close",
          label: "여기까지",
          kind: "close",
        });
      }
    }

    if (options.length === 0) {
      options.push(
        { id: "opt-search", label: `${label} 검색`, kind: "search" },
        { id: "opt-continue", label: "이어서 설명", kind: "continue" }
      );
    }

    return options.slice(0, 3);
  }

  if (dominant === "QUERY") {
    return [
      {
        id: "direct-search",
        label: `${label} ${frame.modifiers[0] ?? "정보"}`.trim(),
        kind: "search",
      },
    ];
  }

  return [];
}

/** Kernel response hint — minimal instruction only (§9). */
export function buildKernelResponseHint(input: {
  decision: KernelCommitDecision;
  dominant: KernelMicroIntentKey;
  frame: EventKernelFrame;
}): string {
  const { decision, dominant, frame } = input;
  const label = entityLabel(frame);

  if (decision === "CLARIFY") {
    if (frame.entities.length > 0) {
      return `「${label}」 관련인가요?`;
    }
    return "무엇을 도와드릴까요?";
  }

  if (decision === "OPTIONS") {
    return "";
  }

  switch (dominant) {
    case "CLOSE":
      return "네.";
    case "ACK":
      return "네.";
    case "PASSIVE":
      return "ㅎㅎ";
    case "QUERY":
    case "SHIFT":
    case "CONTINUE":
    default:
      return "";
  }
}

/** @deprecated use buildKernelResponseHint */
export const buildKernelResponse = buildKernelResponseHint;

export function kernelAllowsPhase1Deterministic(state: EventKernelState): boolean {
  if (state.committedDecision !== "DIRECT_ACTION") {
    return false;
  }
  return state.dominantIntent === "QUERY" || state.dominantIntent === "SHIFT";
}

export function kernelRequiresEarlyReturn(state: EventKernelState): boolean {
  if (state.committedDecision === "CLARIFY" || state.committedDecision === "OPTIONS") {
    return true;
  }
  if (state.committedDecision === "DIRECT_ACTION") {
    return (
      state.dominantIntent === "CLOSE" ||
      state.dominantIntent === "ACK" ||
      state.dominantIntent === "PASSIVE"
    );
  }
  return false;
}

export function kernelExecutionMode(
  state: EventKernelState
): "action" | "conversation" {
  if (state.committedDecision !== "DIRECT_ACTION") {
    return "conversation";
  }
  if (state.dominantIntent === "QUERY" || state.dominantIntent === "SHIFT") {
    return "action";
  }
  return "conversation";
}

export { dominantMicroIntent };
