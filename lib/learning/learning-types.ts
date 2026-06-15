import type { CapabilityId } from "@/lib/capability-registry/capability-types";
import type {
  ContextSnapshot,
  LearningChannel,
  ObservationActionType,
  ObservationResultStatus,
} from "@/lib/learning/learning-contract";

export type WeightUpdateInput = {
  capabilityId: CapabilityId;
  delta: number;
  timestamp: string;
  channel?: LearningChannel;
  hourBucket?: number;
};

export type DetectedPatternKind =
  | "capability_habit"
  | "channel_preference"
  | "time_of_day_shift"
  | "retry_friction";

export type DetectedPattern = {
  kind: DetectedPatternKind;
  capabilityId?: CapabilityId;
  channel?: LearningChannel;
  hourBucket?: number;
  strength: number;
  sampleCount: number;
};

export type IngestObservationInput = {
  executionId?: string;
  capabilityId: CapabilityId;
  surfaceId?: string;
  actionType: ObservationActionType;
  resultStatus: ObservationResultStatus;
  timestamp?: string;
  contextSnapshot?: ContextSnapshot;
};

export type LearningEngineState = "idle" | "ingesting" | "replaying";

export type ReplayOptions = {
  now: Date;
  applyDecay?: boolean;
};
