import type { OrchestrateHistoryTurn } from "@/lib/action-chat/orchestrator-types";

import type { IntentRoute } from "@/lib/action-chat/intent-router-core";

import type {

  OrchestratorMode,

  ResponseTone,

} from "@/lib/action-chat/mode-switching";

import {

  projectIntentRouteFromKernel,

  runEventKernelOS,

  type EventKernelOSResult,

} from "@/lib/event-kernel";

import type { EventKernelMemoryState } from "@/lib/event-kernel/memory/types";

import {

  commitKernelMemory,

  getKernelMemory,

} from "@/lib/event-kernel/memory/kernel-memory-store";

import { detectTone } from "@/lib/action-chat/mode-switching";



export type ConversationEventState = IntentRoute & {

  mode: OrchestratorMode;

  mode_reason: string;

  tone: ResponseTone;

  os: EventKernelOSResult;

  kernel: EventKernelOSResult["kernel"];

  memory: EventKernelOSResult["memory"];

  memoryOutput: EventKernelOSResult["memoryOutput"];

  searchPlan: EventKernelOSResult["searchPlan"];

};



/** Event Kernel OS entry — full §4 flow, no layer bypass. */

export function buildConversationEventState(input: {

  message: string;

  history?: OrchestrateHistoryTurn[];

  linkTitle?: string | null;

  previousMemory?: EventKernelMemoryState | null;

  scopeId?: string;

}): ConversationEventState {

  const scopeId = input.scopeId ?? "default";

  const previousMemory = input.previousMemory ?? getKernelMemory(scopeId);



  const os = runEventKernelOS({

    message: input.message,

    history: input.history,

    linkTitle: input.linkTitle,

    previousMemory,

  });



  commitKernelMemory(os.memory, scopeId);



  const route = projectIntentRouteFromKernel({

    kernel: os.kernel,

    message: input.message.trim(),

    linkTitle: input.linkTitle,

    history: input.history,

  });



  return {

    ...route,

    mode: route.execution_mode,

    mode_reason: `kernel:${os.kernel.committedDecision}/${os.kernel.dominantIntent}`,

    tone: detectTone(input.message),

    os,

    kernel: os.kernel,

    memory: os.memory,

    memoryOutput: os.memoryOutput,

    searchPlan: os.searchPlan,

  };

}



export function eventStateToIntentRoute(state: ConversationEventState): IntentRoute {

  return {

    intent_type: state.intent_type,

    requires_context_switch: state.requires_context_switch,

    current_topic: state.current_topic,

    relevance_score: state.relevance_score,

    micro_intent: state.micro_intent,

    micro_confidence: state.micro_confidence,

    stability_score: state.stability_score,

    turn_pressure: state.turn_pressure,

    continuity: state.continuity,

    kernel_entropy: state.kernel_entropy,

    kernel_decision: state.kernel_decision,

    execution_mode: state.execution_mode,

  };

}


