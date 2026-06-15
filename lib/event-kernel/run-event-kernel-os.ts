import type { OrchestratorResult } from "@/lib/action-chat/orchestrator-types";

import { orchestrateEventKernel } from "@/lib/event-kernel/orchestrate-event-kernel";

import type { OrchestrateEventKernelWithMemoryInput } from "@/lib/event-kernel/orchestrate-event-kernel-with-memory";

import {

  kernelExecutionIsTerminal,

  type KernelExecutionHint,

  type KernelExecutionOutcome,

} from "@/lib/event-kernel/execute-kernel-decision";

import {

  executeKernelIntent,

  kernelIntentIsTerminal,

} from "@/lib/event-kernel/execute-kernel-intent";

import { decideKernelIntent } from "@/lib/event-kernel/decide-kernel-intent";

import { composeIntentKernelOutput } from "@/lib/event-kernel/compose-intent-kernel-output";

import type { IntentKernelSystemOutput } from "@/lib/event-kernel/intent-kernel-system/types";

import type { KernelIntentDecision } from "@/lib/event-kernel/intent-kernel-system/types";

import { collectMemoryHints } from "@/lib/event-kernel/memory/collect-memory-hints";

import {
  attachMemoryDirective,
  deriveMemoryDirective,
} from "@/lib/event-kernel/memory/derive-memory-directive";
import { executeMemoryWriter } from "@/lib/event-kernel/memory/memory-writer";
import {
  buildMemoryRetrievalStats,
  buildTurnMemoryAccessLog,
  runMemoryLifespanEngine,
  type MemoryLifecycleEvent,
} from "@/lib/event-kernel/memory/memory-lifespan-engine";
import { normalizeMemoryKey } from "@/lib/event-kernel/memory/normalize-memory-key";
import {
  retrievalFusionV2,
  type RankedMemory,
} from "@/lib/event-kernel/memory/retrieval-fusion-v2";
import type { EventKernelMemoryOutput, EventKernelMemoryState } from "@/lib/event-kernel/memory/types";
import { emptyKernelMemoryState } from "@/lib/event-kernel/memory/types";

import {

  buildKernelUiRenderInput,

  renderKernelUi,

  type KernelUiRenderModel,

} from "@/lib/event-kernel/render-kernel-ui";

import type { EventKernelSearchPlan } from "@/lib/event-kernel/search-planner/types";

import {

  serializeEventKernelOutput,

  type EventKernelStrictOutput,

} from "@/lib/event-kernel/serialize-event-kernel-output";

import type { EventKernelState } from "@/lib/event-kernel/types";
import {
  kernelShouldPlanSearch,
  planKernelSearch,
} from "@/lib/event-kernel/search-planner/plan-kernel-search";
import { planExecution } from "@/lib/event-kernel/execution-planner/plan-execution";
import type { ExecutionPlan } from "@/lib/event-kernel/execution-planner/types";
import {
  buildKernelDecisionTrace,
  emitKernelDecisionTrace,
  type KernelDecisionTrace,
} from "@/lib/event-kernel/trace/kernel-decision-trace";
import { buildEntityActionSurface } from "@/lib/event-kernel/entity/entity-action-surface";
import { overlayEntityActionSurfaceOnOsResult } from "@/lib/event-kernel/entity/apply-entity-action-surface";
import type { EntityActionSurfaceWire } from "@/lib/event-kernel/entity/entity-action-surface-types";
import {
  buildMissingSlotKernelOutcome,
  evaluateContractGate,
  type ContractGateEvaluation,
} from "@/lib/event-kernel/slot-filling/contract-gated-execution";



export type EventKernelOSDisposition = "terminal" | "delegate" | "hold";



/** §8 user-facing output — minimal, no internal reasoning exposed. */

export type EventKernelOSOutput = {

  summary: string;

  disposition: EventKernelOSDisposition;

  hint: KernelExecutionHint;

  actions: Array<{ id: string; label: string }>;

};



export type EventKernelOSResult = {

  kernel: EventKernelState;

  kernelDecision: KernelIntentDecision;

  memory: EventKernelMemoryState;

  memoryOutput: EventKernelMemoryOutput;

  /** Post-storage lifecycle transitions (decay / reinforce / compress / forget). */
  lifecycleEvents: MemoryLifecycleEvent[];

  /** Read-only fusion layer — does not affect kernel or execution routing. */
  rankedMemories: RankedMemory[];

  searchPlan: EventKernelSearchPlan | null;

  executionPlan: ExecutionPlan;

  execution: KernelExecutionOutcome;

  orchestratorResult: OrchestratorResult | null;

  ui: KernelUiRenderModel | null;

  kernelWire: EventKernelStrictOutput;

  /** §6 strict system output — kernel > memory > execution. */

  system: IntentKernelSystemOutput;

  /** Internal observability — does not affect pipeline. */
  trace: KernelDecisionTrace;

  output: EventKernelOSOutput;

  /** Read-only Entity Action Surface — does not alter kernel decision or memory. */
  entityActionSurface: EntityActionSurfaceWire | null;

  /** Post-kernel slot + contract gate (does not change kernel decision). */
  contractGate: ContractGateEvaluation;

};



function buildOSOutput(input: {

  execution: KernelExecutionOutcome;

  orchestratorResult: OrchestratorResult | null;

  ui: KernelUiRenderModel | null;

}): EventKernelOSOutput {

  const { execution, orchestratorResult, ui } = input;



  if (execution.disposition === "delegate") {

    return {

      summary: "",

      disposition: "delegate",

      hint: execution.hint,

      actions: [],

    };

  }



  const summary =

    ui?.coreMessage ||

    orchestratorResult?.summary?.trim() ||

    "";



  const actions =

    orchestratorResult?.actions?.slice(0, 3).map((action) => ({

      id: action.id,

      label: action.label,

    })) ??

    ui?.actionCards ??

    [];



  return {

    summary,

    disposition: execution.disposition === "hold" ? "hold" : "terminal",

    hint: execution.hint,

    actions,

  };

}



/**

 * Intent Kernel System — strict multi-layer pipeline (§1–§8).

 *

 * INPUT → KERNEL → MEMORY WRITER → LIFESPAN → STORE → RETRIEVAL FUSION v2 → EXECUTION PLANNER → EXECUTION → RENDER

 *

 * KERNEL is the sole decider. MEMORY is advisory only.

 */

export function runEventKernelOS(

  input: OrchestrateEventKernelWithMemoryInput

): EventKernelOSResult {

  const kernel = orchestrateEventKernel(input);

  const previousMemory = input.previousMemory ?? emptyKernelMemoryState(input.now);



  const memoryHints = collectMemoryHints({

    message: input.message,

    history: input.history,

    memory: previousMemory,

    linkTitle: input.linkTitle,

    frameEntities: kernel.frame.entities,

  });



  const rankedMemories = retrievalFusionV2({

    message: input.message,

    memory: previousMemory,

    now: input.now,

  });



  const kernelDecisionBase = decideKernelIntent({

    message: input.message,

    history: input.history,

    base: kernel,

    memoryHints,

  });



  const memoryDirective = deriveMemoryDirective({

    decision: kernelDecisionBase,

    message: input.message,

    kernel,

    previousMemory,

  });

  const kernelDecision = attachMemoryDirective(kernelDecisionBase, memoryDirective);



  const written = executeMemoryWriter({

    kernelDecision,

    event: {

      kernel,

      userMessage: input.message.trim(),

      now: input.now,

    },

    memoryState: previousMemory,

  });

  const postWriteFusion = retrievalFusionV2({

    message: input.message,

    memory: written.state,

    now: input.now,

  });

  const lifespan = runMemoryLifespanEngine({

    memoryState: written.state,

    retrievalStats: buildMemoryRetrievalStats(

      postWriteFusion.slice(0, 8).map((row) => ({

        id: row.item.id,

        key: normalizeMemoryKey(row.item.label) || row.item.id,

        at: input.now,

      }))

    ),

    accessLog: buildTurnMemoryAccessLog({

      memory: written.state,

      frameEntities: kernel.frame.entities,

      now: input.now,

    }),

    now: input.now,

  });

  const memory = lifespan.updatedMemoryState;

  const memoryOutput = written.output;

  const lifecycleEvents = lifespan.lifecycleEvents;



  const searchPlan = kernelShouldPlanSearch(kernel)

    ? planKernelSearch({

        kernel,

        memory,

        userMessage: input.message.trim(),

      })

    : null;



  const kernelWire = serializeEventKernelOutput(kernel);

  const executionPlan = planExecution(
    kernelDecision,
    memory,
    input.message.trim()
  );

  const runtime = {
    actions: kernel.actions,
    turnPressure: kernel.turnPressure,
    frame: kernel.frame,
  };

  const contractGate = evaluateContractGate(input.message.trim());

  const execution =
    contractGate.state === "MISSING_SLOT"
      ? buildMissingSlotKernelOutcome({
          gate: contractGate,
          wire: kernelWire,
          runtime,
        })
      : executeKernelIntent({
          decision: kernelDecision,
          wire: kernelWire,
          runtime,
          executionAction: executionPlan.action,
        });



  const orchestratorResult = execution.result;

  const system = composeIntentKernelOutput({
    kernel: kernelDecision,
    memory: memoryHints,
    plan: executionPlan,
  });

  const trace = buildKernelDecisionTrace({
    message: input.message,
    historyTurnCount: input.history?.length ?? 0,
    base: {
      entropy: kernel.entropy,
      committedDecision: kernel.committedDecision,
      dominantIntent: kernel.dominantIntent,
      signals: kernel.signals,
    },
    memoryHints,
    kernelDecision,
  });
  emitKernelDecisionTrace(trace);



  let ui: KernelUiRenderModel | null = null;

  if (kernelIntentIsTerminal(execution) && orchestratorResult) {

    ui = renderKernelUi(

      buildKernelUiRenderInput(

        kernel,

        orchestratorResult.summary,

        orchestratorResult.summary

      )

    );

  }



  const output = buildOSOutput({ execution, orchestratorResult, ui });

  const entityActionSurface = buildEntityActionSurface(input.message.trim());

  let final: EventKernelOSResult = {
    kernel,
    kernelDecision,
    memory,
    memoryOutput,
    lifecycleEvents,
    rankedMemories,
    searchPlan,
    executionPlan,
    execution,
    orchestratorResult,
    ui,
    kernelWire,
    system,
    trace,
    output,
    entityActionSurface,
    contractGate,
  };

  if (
    entityActionSurface &&
    kernel.committedDecision === "CLARIFY" &&
    kernelIntentIsTerminal(execution) &&
    execution.hint === "clarify"
  ) {
    final = overlayEntityActionSurfaceOnOsResult(final, entityActionSurface);
  }

  return final;

}



/** True when OS produced a terminal/hold response (no pipeline delegate). */

export function eventKernelOSIsTerminal(result: EventKernelOSResult): boolean {

  return kernelExecutionIsTerminal(result.execution);

}


