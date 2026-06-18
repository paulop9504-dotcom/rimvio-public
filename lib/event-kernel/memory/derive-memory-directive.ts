import { containsDeicticReference } from "@/lib/event-kernel/memory/collect-memory-hints";
import type { EventKernelMemoryState } from "@/lib/event-kernel/memory/types";
import type {
  KernelIntentDecision,
  MemoryDirective,
} from "@/lib/event-kernel/intent-kernel-system/types";
import type { EventKernelState } from "@/lib/event-kernel/types";

const RECALL_QUESTION =
  /^(?:그거|그게|저거|이거)\s*뭐(?:였|더|야)?(?:지|어|나|까|더라)?/iu;
const ENTITY_FACT_ATTRIBUTE = /(?:가격|얼마)/iu;
const CONTEXT_ATTRIBUTE = /(?:환불|정책|방법|절차)/iu;

/**
 * Advisory memory directive — derived after KERNEL decision only.
 * KERNEL must not read this field.
 */
export function deriveMemoryDirective(input: {
  decision: KernelIntentDecision;
  message: string;
  kernel: EventKernelState;
  previousMemory?: EventKernelMemoryState | null;
}): MemoryDirective {
  const message = input.message.trim();
  const { decision, kernel } = input;

  if (RECALL_QUESTION.test(message) || containsDeicticReference(message)) {
    if (decision.state === "CLARIFY_A" || decision.state === "CLARIFY_B") {
      return "IGNORE";
    }
    if (RECALL_QUESTION.test(message)) {
      return "IGNORE";
    }
  }

  if (decision.state === "TERMINAL_ACK" && decision.notes === "standalone_ack") {
    return "IGNORE";
  }

  if (decision.state === "CONTINUE") {
    if (decision.notes?.startsWith("ack_as_continue")) {
      return "WRITE_STM";
    }
    return "IGNORE";
  }

  if (kernel.dominantIntent === "CLOSE") {
    return "COMPRESS";
  }

  if (decision.state === "DIRECT_ACTION") {
    if (CONTEXT_ATTRIBUTE.test(message)) {
      return "WRITE_WM";
    }
    if (ENTITY_FACT_ATTRIBUTE.test(message)) {
      return "WRITE_LTM";
    }
    return "WRITE_WM";
  }

  if (decision.state === "CLARIFY_A" || decision.state === "CLARIFY_B") {
    return "IGNORE";
  }

  if (kernel.dominantIntent === "QUERY" && ENTITY_FACT_ATTRIBUTE.test(message)) {
    return "WRITE_LTM";
  }

  if (kernel.dominantIntent === "QUERY" || kernel.dominantIntent === "SHIFT") {
    return "WRITE_WM";
  }

  void input.previousMemory;
  return "WRITE_STM";
}

export function attachMemoryDirective(
  decision: KernelIntentDecision,
  directive: MemoryDirective
): KernelIntentDecision {
  return { ...decision, memoryDirective: directive };
}
