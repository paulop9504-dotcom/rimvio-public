import { foldKernelMemory } from "@/lib/event-kernel/memory/fold-kernel-memory";
import { commitKernelMemory } from "@/lib/event-kernel/memory/kernel-memory-store";
import type {
  EventKernelMemoryOutput,
  EventKernelMemoryState,
} from "@/lib/event-kernel/memory/types";
import { emptyKernelMemoryState } from "@/lib/event-kernel/memory/types";
import type { KernelIntentDecision } from "@/lib/event-kernel/intent-kernel-system/types";
import type { EventKernelState } from "@/lib/event-kernel/types";

export type MemoryWriterEvent = {
  kernel: EventKernelState;
  userMessage: string;
  now?: string;
};

export type MemoryWriterInput = {
  kernelDecision: KernelIntentDecision;
  event: MemoryWriterEvent;
  memoryState: EventKernelMemoryState;
  scopeId?: string;
};

export type MemoryWriterResult = {
  state: EventKernelMemoryState;
  output: EventKernelMemoryOutput;
  committed: boolean;
};

function noopMemoryOutput(state: EventKernelMemoryState): EventKernelMemoryOutput {
  return {
    stm: state.stm,
    wm: state.wm,
    ltm: state.ltm,
    active_links: state.active_links,
    decayed_items: [],
  };
}

/**
 * MEMORY WRITER — executes kernel memoryDirective only; no intent or route changes.
 */
export function executeMemoryWriter(input: MemoryWriterInput): MemoryWriterResult {
  const directive = input.kernelDecision.memoryDirective ?? "WRITE_STM";
  const previous = input.memoryState ?? emptyKernelMemoryState(input.event.now);

  if (directive === "IGNORE") {
    return {
      state: previous,
      output: noopMemoryOutput(previous),
      committed: false,
    };
  }

  const folded = foldKernelMemory({
    kernel: input.event.kernel,
    userMessage: input.event.userMessage,
    previous,
    now: input.event.now,
  });

  const scopeId = input.scopeId;
  if (scopeId) {
    commitKernelMemory(folded.state, scopeId);
  }

  return {
    state: folded.state,
    output: folded.output,
    committed: true,
  };
}
