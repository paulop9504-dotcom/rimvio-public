import type { OrchestratorResult } from "@/lib/action-chat/orchestrator-types";

/** Rimvio Orchestrator v2 — Phase × Tier (0 = pre-pipeline early tree). */
export type OrchestratorPhase = 0 | 1 | 2 | 3;

export type OrchestratorTierId =
  | 0
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12;

export type OrchestratorTierLabel =
  | "KillSwitch"
  | "Security"
  | "Correction"
  | "Workflow"
  | "Registry"
  | "Deterministic"
  | "EventDetection"
  | "EventKernel"
  | "Shadow"
  | "Container"
  | "GlobalBrain"
  | "Retrieval"
  | "IntentKernel"
  | "Architect"
  | "Dispatcher";

import type { ShadowCandidateWire } from "@/lib/notification-shadow/inject-shadow-context";

export type EnrichmentBundle = {
  shadowCandidates: ShadowCandidateWire[];
  shadowContextBlock: string | null;
  containerContextBlock: string | null;
  behaviorContextBlock: string | null;
  retrievedContextBlock: string | null;
};

export type Phase1Outcome = {
  phase: 1;
  earlyReturn: OrchestratorResult | null;
};

export type Phase2Outcome = {
  phase: 2;
  enrichment: EnrichmentBundle;
  fastPath: OrchestratorResult | null;
};

export type Phase3Outcome = {
  phase: 3;
  result: OrchestratorResult;
};

export const EMPTY_ENRICHMENT: EnrichmentBundle = {
  shadowCandidates: [],
  shadowContextBlock: null,
  containerContextBlock: null,
  behaviorContextBlock: null,
  retrievedContextBlock: null,
};
