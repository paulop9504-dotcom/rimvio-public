import type { ExecutionRecord } from "@/lib/execution/execution-contract";
import type { CapabilityId } from "@/lib/capability-registry/capability-types";
import type {
  ContextSnapshot,
  LearningObservation,
  ObservationResultStatus,
} from "@/lib/learning/learning-contract";
import { assertLearningTransition } from "@/lib/learning/learning-lifecycle";
import { detectPatterns } from "@/lib/learning/pattern-detector";
import {
  appendObservation,
  listObservations,
  resetObservationStreamForTests,
} from "@/lib/learning/observation-stream";
import {
  applyWeightDecay,
  applyWeightUpdate,
  getPreferenceWeightSnapshot,
  resetPreferenceWeightsForTests,
} from "@/lib/learning/preference-weights";
import type {
  IngestObservationInput,
  LearningEngineState,
  ReplayOptions,
  WeightUpdateInput,
} from "@/lib/learning/learning-types";
import { readStabilityControlFlags } from "@/lib/stability/stability-state-store";
import { applySynapticFromLearningObservation } from "@/lib/synaptic/synapse-engine";

const REINFORCE = {
  executeSuccess: 0.12,
  executeFail: -0.04,
  executeCancel: -0.02,
  ignore: -0.08,
  retryWeak: 0.015,
  patternBoost: 0.03,
} as const;

let engineState: LearningEngineState = "idle";
let observationCounter = 0;

function nextObservationId(timestamp: string): string {
  observationCounter += 1;
  return `obs-${timestamp}-${observationCounter}`;
}

function hourBucketFromIso(iso: string): number {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) {
    return 0;
  }
  return new Date(ms).getUTCHours();
}

function parseContextSnapshot(
  raw?: Record<string, string>,
  fallback?: ContextSnapshot,
): ContextSnapshot {
  if (!raw && !fallback) {
    return {};
  }
  const channel = (raw?.channel ?? fallback?.channel) as ContextSnapshot["channel"];
  const hourRaw = raw?.hourBucket ?? fallback?.hourBucket;
  return {
    dateKey: raw?.dateKey ?? fallback?.dateKey,
    hourBucket: hourRaw !== undefined ? Number(hourRaw) : fallback?.hourBucket,
    channel,
    surfaceType: raw?.surfaceType ?? fallback?.surfaceType,
    urgencyHours:
      raw?.urgencyHours !== undefined
        ? Number(raw.urgencyHours)
        : fallback?.urgencyHours,
  };
}

function resultStatusFromExecution(
  status: ExecutionRecord["status"],
): ObservationResultStatus | null {
  if (status === "completed") {
    return "success";
  }
  if (status === "failed") {
    return "fail";
  }
  if (status === "cancelled") {
    return "cancel";
  }
  return null;
}

function deltaForObservation(observation: LearningObservation): number {
  if (observation.actionType === "ignore") {
    return REINFORCE.ignore;
  }
  if (observation.actionType === "retry_signal") {
    return REINFORCE.retryWeak;
  }
  switch (observation.resultStatus) {
    case "success":
      return REINFORCE.executeSuccess;
    case "fail":
      return REINFORCE.executeFail;
    case "cancel":
      return REINFORCE.executeCancel;
    default:
      return 0;
  }
}

function patternMultiplier(observation: LearningObservation): number {
  const patterns = detectPatterns(listObservations());
  let boost = 0;
  for (const pattern of patterns) {
    if (
      pattern.kind === "capability_habit" &&
      pattern.capabilityId === observation.capabilityId
    ) {
      boost += REINFORCE.patternBoost * pattern.strength;
    }
    if (
      pattern.kind === "time_of_day_shift" &&
      pattern.capabilityId === observation.capabilityId &&
      pattern.hourBucket === observation.contextSnapshot.hourBucket
    ) {
      boost += REINFORCE.patternBoost * 0.5 * pattern.strength;
    }
    if (
      pattern.kind === "channel_preference" &&
      pattern.channel === observation.contextSnapshot.channel
    ) {
      boost += REINFORCE.patternBoost * 0.4 * pattern.strength;
    }
    if (pattern.kind === "retry_friction" && observation.actionType === "retry_signal") {
      boost += REINFORCE.patternBoost * 0.2;
    }
  }
  return boost;
}

function toWeightUpdate(observation: LearningObservation): WeightUpdateInput {
  const delta = deltaForObservation(observation) + patternMultiplier(observation);
  return {
    capabilityId: observation.capabilityId,
    delta,
    timestamp: observation.timestamp,
    channel: observation.contextSnapshot.channel,
    hourBucket: observation.contextSnapshot.hourBucket,
  };
}

/** Process one observation into preference weights (deterministic). */
export function processObservation(observation: LearningObservation): void {
  assertLearningTransition(engineState, "ingesting");
  engineState = "ingesting";
  applyWeightUpdate(toWeightUpdate(observation));
  engineState = "idle";
}

export function ingestObservation(input: IngestObservationInput): LearningObservation {
  const timestamp = input.timestamp ?? new Date().toISOString();
  const observation: LearningObservation = {
    observationId: nextObservationId(timestamp),
    executionId: input.executionId,
    capabilityId: input.capabilityId,
    surfaceId: input.surfaceId,
    actionType: input.actionType,
    resultStatus: input.resultStatus,
    timestamp,
    contextSnapshot: {
      ...input.contextSnapshot,
      hourBucket:
        input.contextSnapshot?.hourBucket ?? hourBucketFromIso(timestamp),
    },
  };
  appendObservation(observation);
  processObservation(observation);
  applySynapticFromLearningObservation({
    surfaceId: observation.surfaceId,
    capabilityId: observation.capabilityId,
    actionType: observation.actionType,
    resultStatus: observation.resultStatus,
  });
  return observation;
}

/** Bridge: Execution Plane terminal record → observation (write path only). */
export function ingestExecutionOutcome(record: ExecutionRecord): LearningObservation | null {
  if (readStabilityControlFlags().learningPaused) {
    return null;
  }

  const resultStatus = resultStatusFromExecution(record.status);
  if (!resultStatus) {
    return null;
  }

  const meta = record.metadata ?? {};
  const contextSnapshot = parseContextSnapshot(meta, {
    channel: meta.channel as ContextSnapshot["channel"],
    surfaceType: meta.surfaceType,
    dateKey: meta.dateKey,
    hourBucket: hourBucketFromIso(record.completedAt ?? record.createdAt),
  });

  const actionType =
    record.retryCount > 0 && resultStatus === "fail" ? "retry_signal" : "execute";

  return ingestObservation({
    executionId: record.executionId,
    capabilityId: record.capabilityId as CapabilityId,
    surfaceId: meta.surfaceId,
    actionType,
    resultStatus,
    timestamp: record.completedAt ?? record.createdAt,
    contextSnapshot,
  });
}

/** Negative reinforcement when user ignores primary action. */
export function observeIgnoredPrimaryAction(input: {
  capabilityId: CapabilityId;
  surfaceId: string;
  timestamp?: string;
  contextSnapshot?: ContextSnapshot;
}): LearningObservation {
  return ingestObservation({
    capabilityId: input.capabilityId,
    surfaceId: input.surfaceId,
    actionType: "ignore",
    resultStatus: "cancel",
    timestamp: input.timestamp,
    contextSnapshot: input.contextSnapshot,
  });
}

/**
 * Replay full observation stream — deterministic rebuild of weights.
 */
export function replayLearningFromObservations(
  observations: readonly LearningObservation[],
  options: ReplayOptions,
): ReturnType<typeof getPreferenceWeightSnapshot> {
  assertLearningTransition(engineState, "replaying");
  engineState = "replaying";
  resetPreferenceWeightsForTests();
  resetObservationStreamForTests();
  observationCounter = 0;

  const ordered = [...observations].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  for (const row of ordered) {
    appendObservation(row);
    applyWeightUpdate(toWeightUpdate(row));
  }

  if (options.applyDecay !== false) {
    applyWeightDecay(options.now);
  }

  engineState = "idle";
  return getPreferenceWeightSnapshot(options.now);
}

export function getLearningEngineState(): LearningEngineState {
  return engineState;
}

export function resetLearningEngineForTests(): void {
  engineState = "idle";
  observationCounter = 0;
  resetPreferenceWeightsForTests();
  resetObservationStreamForTests();
}
