import type { OrchestrateHistoryTurn } from "@/lib/action-chat/orchestrator-types";
import type { ExistingScheduleInput } from "@/lib/schedule/day-schedule";

/** L0–L4 abstraction ladder. */
export type AbstractionLevel = "L0" | "L1" | "L2" | "L3" | "L4";

export type DomainTag =
  | "food"
  | "schedule"
  | "place"
  | "health"
  | "exercise"
  | "money"
  | "relationship"
  | "work"
  | "routine"
  | "emotion"
  | "general";

export type TimeScale =
  | "now"
  | "today"
  | "week"
  | "month"
  | "lifecycle";

export type ActionType =
  | "decision"
  | "planning"
  | "optimization"
  | "tracking";

export type RoutingType =
  | "FOOD"
  | "CALENDAR"
  | "DECISION"
  | "SOCIAL"
  | "UNKNOWN";

export type FailureType =
  | "misroute"
  | "collapse"
  | "overfit"
  | "fallback"
  | "none";

export type ConflictKind = "HARD" | "SOFT" | "OPTIONAL";

export type ResolutionStrategy =
  | "RESCHEDULE"
  | "MERGE"
  | "DROP"
  | "DEFER"
  | "SPLIT";

export type AdversarialKind =
  | "boundary_break"
  | "noise_injection"
  | "intent_conflict"
  | "context_drift";

export type IntentExpansion = {
  intentCore: string;
  expandedIntents: string[];
  domainMapping: DomainTag[];
  timeScaling: TimeScale[];
  actionType: ActionType;
};

export type AbstractionAnalysis = {
  level: AbstractionLevel;
  reason: string;
  mustAskQuestion: boolean;
  allowedOutput: "question" | "recommend" | "plan" | "system_design";
};

export type SemanticVariation = {
  label: string;
  text: string;
};

export type AdversarialTest = {
  kind: AdversarialKind;
  input: string;
  description: string;
};

export type RoutingValidationRow = {
  input: string;
  expectedIntent: RoutingType;
  predictedIntent: RoutingType;
  routingType: RoutingType;
  failureType: FailureType;
  pass: boolean;
};

export type ScheduleResolution = {
  strategy: ResolutionStrategy;
  summary: string;
  impact: string;
};

export type SchedulingConflictAnalysis = {
  conflictDetected: boolean;
  conflictKinds: ConflictKind[];
  affectedExisting: string[];
  resolutions: ScheduleResolution[];
  recommendedAction: string;
};

export type UnifiedStressCase = {
  id: string;
  label: string;
  input: string;
  history?: readonly OrchestrateHistoryTurn[];
  expectedRouting: RoutingType;
  expectedAbstraction?: AbstractionLevel;
  existingSchedule?: ExistingScheduleInput;
  proposedSchedule?: ExistingScheduleInput;
  tags?: string[];
};

export type UnifiedStressRun = {
  case: UnifiedStressCase;
  expansion: IntentExpansion;
  abstraction: AbstractionAnalysis;
  semanticVariations: SemanticVariation[];
  adversarialTests: AdversarialTest[];
  routingRows: RoutingValidationRow[];
  scheduling: SchedulingConflictAnalysis;
  failureAttempts: number;
  pass: boolean;
};

export type WeaknessMap = {
  weakestDomains: Array<{ domain: DomainTag; failCount: number }>;
  topFailurePatterns: Array<{ pattern: FailureType; count: number }>;
  abstractionCollapseZones: Array<{ level: AbstractionLevel; failCount: number }>;
  schedulingConflictRate: number;
  routingFailureRate: number;
};

export type UnifiedStressConsolidation = {
  totalCases: number;
  passed: number;
  failed: number;
  weaknessMap: WeaknessMap;
};
