export type {
  ActionTelemetryEvent,
  ActionTelemetryKind,
  ActionTier,
  ArchivedActionRecord,
  ArchivedActionResult,
  ArchivedBehaviorSnapshot,
  ArchivedEvent,
  ArchivedEventSnapshot,
  ArchivedExecutionSummary,
  FoldArchivedEventResult,
  LearningSignal,
} from "@/lib/archive/types";

export {
  appendActionTelemetry,
  listActionTelemetryForEvent,
  listAllActionTelemetry,
  resetActionTelemetryForTests,
} from "@/lib/archive/action-telemetry-store";

export {
  appendArchivedEvent,
  findArchivedEvent,
  findArchivedEventByEventId,
  listArchivedEvents,
  resetArchiveStoreForTests,
} from "@/lib/archive/archive-store";

export {
  applyLearningSignals,
  findLearningRollupEntry,
  listLearningRollup,
  resetLearningRollupForTests,
  type LearningRollupEntry,
} from "@/lib/archive/learning-rollup-store";

export {
  buildArchiveContextKey,
  buildArchivedEvent,
} from "@/lib/archive/build-archived-event";

export {
  foldArchivedEvent,
  isArchiveFoldComplete,
  isArchiveFoldPending,
} from "@/lib/archive/fold-archived-event";

export {
  recordOverlayActionTelemetry,
  recordOverlayActionsShown,
} from "@/lib/archive/record-action-telemetry";
export {
  feedLinkTelemetryEventId,
  foldFeedLinkLearning,
  recordFeedLinkActionTelemetry,
} from "@/lib/archive/record-feed-link-telemetry";
