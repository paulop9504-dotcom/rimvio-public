import type { OrchestrateHistoryTurn } from "@/lib/action-chat/orchestrator-types";
import type { ExistingScheduleInput } from "@/lib/schedule/day-schedule";
import type {
  AbstractionLevel,
  ConflictKind,
  FailureType,
  ResolutionStrategy,
  RoutingType,
} from "@/lib/testing/unified-stress/types";

export type HardcoreTestSet =
  | "SET1_PURE_BREAKDOWN"
  | "SET2_CONTEXT_COLLAPSE"
  | "SET3_MULTI_CONFLICT"
  | "SET4_TIME_SCHEDULING"
  | "SET5_EMOTIONAL_NOISE"
  | "SET6_HIGH_AMBIGUITY"
  | "SET7_SYSTEM_SHOCK"
  | "SET_MIXED_LAYER";

export type HardcoreFailureMode =
  | FailureType
  | "hallucination"
  | "over-structuring"
  | "scheduling_override"
  | "none";

export type CostFlag = "OK" | "HIGH_COST" | "OVERLOAD" | "LOOP_RISK" | "COST_SPIKE";

export type HardcoreRedTeamCase = {
  id: string;
  testSet: HardcoreTestSet;
  input: string;
  history?: readonly OrchestrateHistoryTurn[];
  existingSchedule?: ExistingScheduleInput;
  proposedSchedule?: ExistingScheduleInput;
  /** Mixed abstraction layers present in input */
  mixedLayers: AbstractionLevel[];
  tags: string[];
  expectedAbstraction?: AbstractionLevel;
  expectedRouting?: RoutingType;
  expectConflict?: boolean;
  expectQuestion?: boolean;
};

export type TokenCostMetrics = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  costPerIntent: number;
  costPerRoutingDecision: number;
  costFlag: CostFlag;
};

export type LatencyMetrics = {
  responseTimeMs: number;
  routingTimeMs: number;
  schedulingCheckTimeMs: number;
};

export type LoadSignals = {
  contextLength: number;
  promptComplexityScore: number;
  recursionDepth: number;
  retryCount: number;
};

export type HardcoreFailureAnalysis = {
  failureMode: HardcoreFailureMode;
  confidenceScore: number;
  systemWeakPoint: string;
  notes: string;
  isFailure: boolean;
};

export type HardcoreExecutionEntry = {
  testId: string;
  input: string;
  testSet: HardcoreTestSet;
  timestamp: string;
  intentCore: string;
  expandedIntents: string[];
  abstractionLevel: AbstractionLevel;
  expectedAbstractionLevel: AbstractionLevel;
  predictedAbstractionLevel: AbstractionLevel;
  abstractionError: boolean;
  routingDecision: RoutingType;
  expectedRouting: RoutingType;
  schedulingConflict: boolean;
  conflictType: ConflictKind | "none";
  conflictResolutionType: ResolutionStrategy | "none";
  failure: HardcoreFailureAnalysis;
  cost: TokenCostMetrics;
  latency: LatencyMetrics;
  load: LoadSignals;
};

export type AdversarialResistanceMetrics = {
  boundaryBreakFailureRate: number;
  noiseInjectionFailureRate: number;
  intentConflictSurvivalRate: number;
  contextDriftHandlingScore: number;
};

export type AbstractionStabilityIndex = {
  l0ConfusionRate: number;
  l1FragmentationRate: number;
  l2MisclassificationRate: number;
  l3OverStructuringRate: number;
  l4OverEngineeringRate: number;
};

export type SchedulingConflictMetrics = {
  conflictDetectedRate: number;
  falsePositiveRate: number;
  falseNegativeRate: number;
  blindSpotCount: number;
};

export type HardcoreBatchSummary = {
  totalTests: number;
  totalTokensUsed: number;
  totalCostUsd: number;
  avgLatencyMs: number;
  failureRate: number;
  topFailureModes: Array<{ mode: HardcoreFailureMode; count: number }>;
  top5WeakestScenarios: Array<{ testId: string; input: string; weakPoint: string }>;
  routingConfusionMap: Array<{ expected: RoutingType; predicted: RoutingType; count: number }>;
  abstractionCollapseZones: Array<{ level: AbstractionLevel; failCount: number }>;
  schedulingBlindSpots: string[];
  overStructuringTriggers: string[];
  adversarialResistance: AdversarialResistanceMetrics;
  abstractionStability: AbstractionStabilityIndex;
  schedulingMetrics: SchedulingConflictMetrics;
  criticalMetrics: {
    ambiguityCollapseRate: number;
    multiIntentOverloadRate: number;
    schedulingOverrideFailureRate: number;
    abstractionMisclassificationRate: number;
    overStructuringFailureRate: number;
  };
  costWarnings: string[];
  systemInsight: {
    mostVulnerableInputType: string;
    highestCostCase: string;
    slowestRoutingPath: string;
  };
};
