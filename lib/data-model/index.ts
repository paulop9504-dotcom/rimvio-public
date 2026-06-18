/**
 * Canonical data-model surface — types re-exported for docs, tests, and integrations.
 * SSOT implementations stay in domain modules (no duplicate logic here).
 */

export {
  ACTION_REGISTRY_SCHEMA_VERSION,
  buildActionRegistryCatalog,
  getRegisteredActionIds,
  type ActionRegistryCatalogEntry,
} from "@/lib/data-model/action-registry-catalog";

export {
  LOCKED_EVENT_SCHEMA_VERSION,
  LOCKED_EVENT_CATEGORIES,
  LOCKED_EVENT_SOURCES,
  LOCKED_EVENT_LIFECYCLES,
  type LockedEventCategory,
  type LockedEventLifecycle,
  type LockedEventSource,
} from "@/lib/event-kernel/schema-lock/event-schema";

export type {
  EventCandidate,
  EventCandidateWire,
  EventCandidateDraft,
  EventCandidateCategory,
  EventCandidateSource,
  EventCandidateLifecycle,
  EventCandidateUpsertInput,
} from "@/lib/events/event-candidate";

export type {
  FailureKind,
  FixTarget,
  InteractionRecord,
  SelfLearningReport,
  ChatTurn,
  ImplicitSignal,
} from "@/lib/self-learning/types";

export type { LiveTurnRequest, LiveTurnLogEntry } from "@/lib/self-learning/live-turn-types";

export type { LearningSignal } from "@/lib/archive/types";
export type { LearningRollupEntry } from "@/lib/archive/learning-rollup-store";
export { listLearningRollup } from "@/lib/archive/learning-rollup-store";
