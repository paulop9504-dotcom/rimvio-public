export type {
  EventKernelState,
  EventKernelFrame,
  EventKernelAction,
  KernelMicroIntentKey,
  MicroIntentDistribution,
  KernelCommitDecision,
  OrchestrateEventKernelInput,
} from "@/lib/event-kernel/types";

export {
  KERNEL_MICRO_INTENT_KEYS,
  ENTROPY_DIRECT_THRESHOLD,
  ENTROPY_OPTIONS_THRESHOLD,
  dominantMicroIntent,
  uniformMicroIntentDistribution,
  frameFromSemanticFrame,
} from "@/lib/event-kernel/types";

export {
  classifyMicroIntentDistribution,
  turnPressureFromDistribution,
} from "@/lib/event-kernel/classify-micro-intent-distribution";

export { computeMicroIntentEntropy } from "@/lib/event-kernel/compute-entropy";

export {
  resolveCommitDecision,
  buildKernelActions,
  buildKernelResponse,
  buildKernelResponseHint,
  kernelAllowsPhase1Deterministic,
  kernelRequiresEarlyReturn,
  kernelExecutionMode,
} from "@/lib/event-kernel/commit-gate";

export { orchestrateEventKernel } from "@/lib/event-kernel/orchestrate-event-kernel";

export {
  orchestrateEventKernelWithMemory,
  type EventKernelWithMemory,
  type OrchestrateEventKernelWithMemoryInput,
} from "@/lib/event-kernel/orchestrate-event-kernel-with-memory";

export {
  foldKernelMemory,
  type FoldKernelMemoryInput,
} from "@/lib/event-kernel/memory/fold-kernel-memory";

export {
  getKernelMemory,
  commitKernelMemory,
  foldAndCommitKernelMemory,
  resetKernelMemoryStoreForTests,
} from "@/lib/event-kernel/memory/kernel-memory-store";

export {
  compressStmEvents,
} from "@/lib/event-kernel/memory/compress-stm";

export {
  normalizeMemoryKey,
  memoryKeysMatch,
} from "@/lib/event-kernel/memory/normalize-memory-key";

export type {
  EventKernelMemoryState,
  EventKernelMemoryOutput,
  KernelMemoryEvent,
  KernelMemoryItem,
  KernelActiveLink,
  KernelMemoryItemKind,
  KernelActiveLinkRelation,
  MemoryLifecycleStage,
} from "@/lib/event-kernel/memory/types";

export {
  runMemoryLifespanEngine,
  buildMemoryRetrievalStats,
  buildTurnMemoryAccessLog,
  type MemoryLifespanInput,
  type MemoryLifespanResult,
  type MemoryLifecycleEvent,
  type MemoryLifecycleEventType,
  type MemoryAccessLogEntry,
  type MemoryRetrievalStats,
} from "@/lib/event-kernel/memory/memory-lifespan-engine";

export {
  emptyKernelMemoryState,
  STM_MAX,
  STM_MIN,
} from "@/lib/event-kernel/memory/types";

export {
  serializeEventKernelOutput,
  formatEventKernelStrictJson,
  type EventKernelStrictOutput,
} from "@/lib/event-kernel/serialize-event-kernel-output";

export {
  projectIntentRouteFromKernel,
  type ProjectedContinuity,
} from "@/lib/event-kernel/project-intent-route";

export {
  executeKernelDecision,
  executeKernelWire,
  executeKernelFromStrictOutput,
  kernelExecutionIsTerminal,
  formatOptionsExecutionResponse,
  type KernelExecutionOutcome,
  type KernelExecutionDisposition,
  type KernelExecutionHint,
  type KernelExecutionRuntime,
} from "@/lib/event-kernel/execute-kernel-decision";

export {
  renderKernelUi,
  buildKernelUiRenderInput,
  renderKernelUiFromInput,
  renderKernelUiFromMessage,
  isKernelUiMessage,
  type KernelUiRenderInput,
  type KernelUiExecutionInput,
  type KernelUiRenderModel,
  type KernelUiBlockKind,
  type KernelUiActionCard,
} from "@/lib/event-kernel/render-kernel-ui";

export { eventKernelToOrchestratorResult } from "@/lib/event-kernel/kernel-to-orchestrator-result";

export {
  planKernelSearch,
  kernelShouldPlanSearch,
  type PlanKernelSearchInput,
} from "@/lib/event-kernel/search-planner/plan-kernel-search";

export type {
  EventKernelSearchPlan,
  KernelSearchType,
  KernelMultiHopStep,
  KernelMemoryBias,
} from "@/lib/event-kernel/search-planner/types";

export {
  SEARCH_ENTROPY_SIMPLE,
  SEARCH_ENTROPY_EXPANDED,
} from "@/lib/event-kernel/search-planner/types";

export {
  runEventKernelOS,
  eventKernelOSIsTerminal,
  type EventKernelOSResult,
  type EventKernelOSOutput,
  type EventKernelOSDisposition,
} from "@/lib/event-kernel/run-event-kernel-os";

export {
  decideKernelIntent,
  type DecideKernelIntentInput,
} from "@/lib/event-kernel/decide-kernel-intent";

export {
  collectMemoryHints,
  containsDeicticReference,
} from "@/lib/event-kernel/memory/collect-memory-hints";

export {
  deriveMemoryDirective,
  attachMemoryDirective,
} from "@/lib/event-kernel/memory/derive-memory-directive";

export {
  executeMemoryWriter,
  type MemoryWriterInput,
  type MemoryWriterResult,
  type MemoryWriterEvent,
} from "@/lib/event-kernel/memory/memory-writer";

export {
  retrievalFusionV2,
  rankedMemoriesToHintCandidates,
  type RankedMemory,
  type RankedMemoryItem,
  type RetrievalFusionV2Input,
} from "@/lib/event-kernel/memory/retrieval-fusion-v2";

export {
  composeIntentKernelOutput,
  formatIntentKernelSystemOutput,
} from "@/lib/event-kernel/compose-intent-kernel-output";

export {
  mapKernelToExecutionAction,
} from "@/lib/event-kernel/map-kernel-execution-action";

export {
  planExecution,
} from "@/lib/event-kernel/execution-planner/plan-execution";

export type {
  ExecutionPlan,
  ExecutionPlanAction,
} from "@/lib/event-kernel/execution-planner/types";

export {
  executeKernelIntent,
  kernelIntentIsTerminal,
} from "@/lib/event-kernel/execute-kernel-intent";

export type {
  IntentKernelSystemOutput,
  KernelIntentDecision,
  KernelFinalState,
  KernelRouteType,
  MemoryDirective,
  MemoryHints,
  MemoryHintCandidate,
  KernelExecutionAction,
} from "@/lib/event-kernel/intent-kernel-system/types";

export {
  routeIntentKernel,
  formatIntentRoutingDecision,
  type RouteIntentKernelInput,
} from "@/lib/event-kernel/intent-routing-kernel/route-intent";

export {
  attemptDeicticRecall,
  buildRecalledCanonicalQuery,
  type DeicticRecallResult,
} from "@/lib/event-kernel/intent-routing-kernel/deictic-recall";

export type {
  IntentRoutingDecision,
  IntentRoutingIntent,
  IntentRoutingState,
  IntentRoutingRoute,
  PreviousTurnIntent,
} from "@/lib/event-kernel/intent-routing-kernel/types";

export {
  buildKernelDecisionTrace,
  formatKernelDecisionTrace,
  emitKernelDecisionTrace,
  setKernelDecisionTraceSink,
  resetKernelDecisionTraceSinkForTests,
  type KernelDecisionTrace,
  type KernelDecisionTraceInput,
  type DeicticTraceStatus,
  type MemoryInfluenceFlag,
} from "@/lib/event-kernel/trace/kernel-decision-trace";

export type {
  EntityInputState,
  EntityType,
  ActionBucket,
  EntityTypeGuess,
  EntityActionSuggestion,
  EntityActionSurfaceWire,
  EntityOnlyDetection,
} from "@/lib/event-kernel/entity/entity-action-surface-types";

export {
  detectEntityOnlyInput,
  classifyEntityInputState,
  guessEntityType,
  bucketsForEntityType,
  buildEntityActionSuggestions,
  buildEntityActionSurface,
  rankBucketsForGuess,
} from "@/lib/event-kernel/entity/entity-action-surface";

export {
  entitySurfaceToQuickPickWire,
  orchestratorResultFromEntitySurface,
  overlayEntityActionSurfaceOnOsResult,
} from "@/lib/event-kernel/entity/apply-entity-action-surface";

export { inferContractAction } from "@/lib/event-kernel/slot-filling/infer-contract-action";

export {
  resolveContractActionFromMessage,
  type ResolvedContractAction,
} from "@/lib/event-kernel/slot-filling/resolve-contract-action-from-message";

export {
  listMentionFeatures,
  listMentionFeatureTokens,
  resolveMentionFeature,
  getMentionFeature,
  resolveMentionFeatureContract,
  buildMentionContextKey,
  isMentionFeatureToken,
  type MentionFeature,
  type MentionFeatureContract,
} from "@/lib/event-kernel/action-contracts/mention-feature-registry";

export {
  parseActionMention,
  isActionFeatureMentionInput,
  formatMentionComposerBlock,
  type ParsedActionMention,
} from "@/lib/event-kernel/action-contracts/parse-action-mention";

export {
  FEATURE_MENTION_SHORTCUTS,
  suggestFeatureMentionShortcuts,
  shouldShowFeatureMentionShortcuts,
  type FeatureMentionShortcut,
} from "@/lib/event-kernel/action-contracts/mention-feature-shortcuts";

export {
  evaluateContractGate,
  buildMissingSlotKernelOutcome,
  type ContractExecutionState,
  type ContractGateEvaluation,
} from "@/lib/event-kernel/slot-filling/contract-gated-execution";

export { extractSlots, type ExtractSlotsResult } from "@/lib/event-kernel/slot-filling/extract-slots";

export {
  buildMissingSlotQuestion,
  type BuildMissingSlotQuestionInput,
} from "@/lib/event-kernel/slot-filling/build-missing-slot-question";

export {
  validateActionContract,
  type ValidateActionContractInput,
  type ValidateActionContractResult,
} from "@/lib/event-kernel/action-contracts/validate-action-contract";

export {
  getActionContract,
  listActionContracts,
  isRegisteredActionContract,
  requiredSlotsForAction,
  ACTION_CONTRACT_REGISTRY,
  ACTION_CONTRACT_SLOTS,
  type ActionContract,
} from "@/lib/event-kernel/action-contracts/action-contract-registry";
