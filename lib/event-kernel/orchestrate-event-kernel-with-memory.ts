import { orchestrateEventKernel } from "@/lib/event-kernel/orchestrate-event-kernel";
import {
  kernelShouldPlanSearch,
  planKernelSearch,
} from "@/lib/event-kernel/search-planner/plan-kernel-search";
import { foldKernelMemory } from "@/lib/event-kernel/memory/fold-kernel-memory";
import type {
  EventKernelMemoryOutput,
  EventKernelMemoryState,
} from "@/lib/event-kernel/memory/types";
import type {
  EventKernelState,
  OrchestrateEventKernelInput,
} from "@/lib/event-kernel/types";

export type OrchestrateEventKernelWithMemoryInput = OrchestrateEventKernelInput & {
  previousMemory?: EventKernelMemoryState | null;
  now?: string;
};

export type EventKernelWithMemory = {
  kernel: EventKernelState;
  memory: EventKernelMemoryState;
  memoryOutput: EventKernelMemoryOutput;
  searchPlan: import("@/lib/event-kernel/search-planner/types").EventKernelSearchPlan | null;
};

/** Kernel + Memory fold in one pass — memory does not alter kernel decisions. */
export function orchestrateEventKernelWithMemory(
  input: OrchestrateEventKernelWithMemoryInput
): EventKernelWithMemory {
  const kernel = orchestrateEventKernel(input);
  const folded = foldKernelMemory({
    kernel,
    userMessage: input.message.trim(),
    previous: input.previousMemory,
    now: input.now,
  });

  const searchPlan = kernelShouldPlanSearch(kernel)
    ? planKernelSearch({
        kernel,
        memory: folded.state,
        userMessage: input.message.trim(),
      })
    : null;

  return {
    kernel,
    memory: folded.state,
    memoryOutput: folded.output,
    searchPlan,
  };
}
