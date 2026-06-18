import type { CapabilityId } from "@/lib/capability-registry/capability-types";

export const LEARNING_CONTRACT_VERSION = 1 as const;

/** Terminal execution outcome for learning — not execution queue status. */
export type ObservationResultStatus = "success" | "fail" | "cancel";

export type ObservationActionType = "execute" | "ignore" | "retry_signal";

export type LearningChannel = "FEED" | "CHAT" | "CALENDAR";

export type ContextSnapshot = {
  dateKey?: string;
  hourBucket?: number;
  channel?: LearningChannel;
  surfaceType?: string;
  urgencyHours?: number;
};

/**
 * Append-only learning observation — NOT Event SSOT.
 * @see docs/RIMVIO_LEARNING_LAYER_V1_REPORT.md
 */
export type LearningObservation = {
  observationId: string;
  executionId?: string;
  capabilityId: CapabilityId;
  surfaceId?: string;
  actionType: ObservationActionType;
  resultStatus: ObservationResultStatus;
  timestamp: string;
  contextSnapshot: ContextSnapshot;
};

export type PreferenceWeightEntry = {
  capabilityId: CapabilityId;
  /** Behavioral probability delta in [-1, 1] — not user preference. */
  weight: number;
  reinforcements: number;
  lastReinforcedAt: string;
};

export type PreferenceWeightSnapshot = {
  contractVersion: typeof LEARNING_CONTRACT_VERSION;
  computedAt: string;
  capabilities: Readonly<Record<string, PreferenceWeightEntry>>;
  channelBias: Readonly<Partial<Record<LearningChannel, number>>>;
};
