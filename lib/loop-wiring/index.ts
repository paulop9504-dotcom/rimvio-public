/**
 * Loop Wiring System v1 — real-world signals → Killer Loop candidates → priority.
 * @see docs/RIMVIO_LOOP_WIRING_V1_REPORT.md
 */
export {
  LOOP_WIRING_CONTRACT_VERSION,
  LOOP_TYPES,
  type LoopType,
  type SignalKind,
  type SignalCategory,
  type TriggerSignal,
  type LoopCandidate,
  type LoopContextSnapshot,
  type LoopWiringResult,
} from "@/lib/loop-wiring/loop-contract";

export type { LoopWiringInput } from "@/lib/loop-wiring/loop-wiring-input";
export {
  SIGNAL_REGISTRY,
  getSignalDefinition,
  assertNoOrphanSignalKinds,
} from "@/lib/loop-wiring/signal-registry";

export {
  collectTriggerSignals,
  buildContextSnapshot,
  resetSignalCounterForTests,
} from "@/lib/loop-wiring/collect-signals";

export {
  signalToLoopCandidates,
  mergeLoopCandidates,
} from "@/lib/loop-wiring/loop-trigger-map";

export {
  selectActiveLoop,
  type LoopPriorityResult,
} from "@/lib/loop-wiring/loop-priority-engine";

export {
  wireKillerLoops,
  wireLoopFromCapabilityExecution,
} from "@/lib/loop-wiring/loop-wiring-engine";

export {
  commitLoopWiringFrame,
  readLastLoopWiringFrame,
  resetLoopWiringStoreForTests,
} from "@/lib/loop-wiring/loop-wiring-store";

export {
  FIXTURE_MORNING_WIRING,
  FIXTURE_TRANSIT_WIRING,
  FIXTURE_INTERRUPTION_WIRING,
  FIXTURE_EVENING_WIRING,
  FIXTURE_GPS_ONLY,
} from "@/lib/loop-wiring/loop-test-fixtures";
