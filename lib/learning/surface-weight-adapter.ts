import type { CapabilityId } from "@/lib/capability-registry/capability-types";
import type { LearningChannel } from "@/lib/learning/learning-contract";
import {
  getCapabilityWeight,
  getChannelBias,
  getHourCapabilityBias,
} from "@/lib/learning/preference-weights";

/** Score points applied to Surface Engine priority — weights × scale. */
const WEIGHT_TO_SCORE = 18;

export type SurfaceLearningContext = {
  now?: Date;
  channel?: LearningChannel;
};

/**
 * Surface Engine may import this module ONLY.
 * Reads derived preference weights — never raw observations or execution logs.
 */
export function getCapabilityLearningBoost(
  capabilityId: CapabilityId,
  context: SurfaceLearningContext = {},
): number {
  const now = context.now ?? new Date();
  const hour = now.getUTCHours();
  const weight =
    getCapabilityWeight(capabilityId) +
    (context.channel ? getChannelBias(context.channel) * 0.4 : 0) +
    getHourCapabilityBias(hour, capabilityId) * 0.3;

  return Math.round(weight * WEIGHT_TO_SCORE * 10) / 10;
}

export function getSurfacePrimaryLearningBoost(
  primaryCapabilityId: CapabilityId,
  context: SurfaceLearningContext = {},
): number {
  return getCapabilityLearningBoost(primaryCapabilityId, context);
}
