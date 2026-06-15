/**
 * Learning Layer v1 — observes execution, updates behavioral weights, influences Surface ranking.
 * @see docs/RIMVIO_LEARNING_LAYER_V1_REPORT.md
 */
export {
  LEARNING_CONTRACT_VERSION,
  type LearningObservation,
  type ObservationResultStatus,
  type ObservationActionType,
  type LearningChannel,
  type ContextSnapshot,
  type PreferenceWeightEntry,
  type PreferenceWeightSnapshot,
} from "@/lib/learning/learning-contract";

export {
  appendObservation,
  listObservations,
  resetObservationStreamForTests,
} from "@/lib/learning/observation-stream";

export {
  ingestObservation,
  ingestExecutionOutcome,
  observeIgnoredPrimaryAction,
  processObservation,
  replayLearningFromObservations,
  getLearningEngineState,
  resetLearningEngineForTests,
} from "@/lib/learning/learning-engine";

export {
  applyWeightDecay,
  applyWeightUpdate,
  getCapabilityWeight,
  getChannelBias,
  getPreferenceWeightSnapshot,
  resetPreferenceWeightsForTests,
} from "@/lib/learning/preference-weights";

export {
  getCapabilityLearningBoost,
  getSurfacePrimaryLearningBoost,
  type SurfaceLearningContext,
} from "@/lib/learning/surface-weight-adapter";

export { detectPatterns } from "@/lib/learning/pattern-detector";

export {
  FIXTURE_NAVIGATE_SUCCESS,
  FIXTURE_ALARM_SUCCESS,
  FIXTURE_IGNORE_NAVIGATE,
  fixtureNavigateReinforcementBatch,
} from "@/lib/learning/learning-test-fixtures";
