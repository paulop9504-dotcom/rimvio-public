import type { CapabilityId } from "@/lib/capability-registry/capability-types";
import {
  LEARNING_CONTRACT_VERSION,
  type LearningChannel,
  type PreferenceWeightEntry,
  type PreferenceWeightSnapshot,
} from "@/lib/learning/learning-contract";
import type { WeightUpdateInput } from "@/lib/learning/learning-types";

const WEIGHT_MIN = -1;
const WEIGHT_MAX = 1;
const DECAY_FACTOR_PER_DAY = 0.92;

const capabilityWeights = new Map<CapabilityId, PreferenceWeightEntry>();
const channelBias = new Map<LearningChannel, number>();
const hourCapabilityBias = new Map<string, number>();

function clampWeight(value: number): number {
  return Math.max(WEIGHT_MIN, Math.min(WEIGHT_MAX, Math.round(value * 1000) / 1000));
}

function hourKey(hour: number, capabilityId: CapabilityId): string {
  return `${hour}:${capabilityId}`;
}

function daysBetween(fromIso: string, to: Date): number {
  const fromMs = Date.parse(fromIso);
  if (Number.isNaN(fromMs)) {
    return 0;
  }
  const delta = to.getTime() - fromMs;
  return delta <= 0 ? 0 : delta / (24 * 60 * 60 * 1000);
}

/** Apply time decay — weights fade unless reinforced. */
export function applyWeightDecay(now: Date): void {
  for (const entry of capabilityWeights.values()) {
    const days = daysBetween(entry.lastReinforcedAt, now);
    if (days <= 0) {
      continue;
    }
    const factor = Math.pow(DECAY_FACTOR_PER_DAY, days);
    entry.weight = clampWeight(entry.weight * factor);
    entry.lastReinforcedAt = now.toISOString();
  }

  for (const [channel, value] of channelBias) {
    void channel;
    channelBias.set(channel, clampWeight(value * 0.99));
  }

  for (const [key, value] of hourCapabilityBias) {
    hourCapabilityBias.set(key, clampWeight(value * 0.99));
  }
}

export function applyWeightUpdate(input: WeightUpdateInput): PreferenceWeightEntry {
  const existing = capabilityWeights.get(input.capabilityId);
  const timestamp = input.timestamp;
  const nextWeight = clampWeight((existing?.weight ?? 0) + input.delta);

  const entry: PreferenceWeightEntry = {
    capabilityId: input.capabilityId,
    weight: nextWeight,
    reinforcements: (existing?.reinforcements ?? 0) + 1,
    lastReinforcedAt: timestamp,
  };
  capabilityWeights.set(input.capabilityId, entry);

  if (input.channel) {
    const channelDelta = input.delta * 0.35;
    channelBias.set(input.channel, clampWeight((channelBias.get(input.channel) ?? 0) + channelDelta));
  }

  if (input.hourBucket !== undefined) {
    const key = hourKey(input.hourBucket, input.capabilityId);
    hourCapabilityBias.set(
      key,
      clampWeight((hourCapabilityBias.get(key) ?? 0) + input.delta * 0.25),
    );
  }

  return entry;
}

export function getCapabilityWeight(capabilityId: CapabilityId): number {
  return capabilityWeights.get(capabilityId)?.weight ?? 0;
}

export function getChannelBias(channel: LearningChannel): number {
  return channelBias.get(channel) ?? 0;
}

export function getHourCapabilityBias(hour: number, capabilityId: CapabilityId): number {
  return hourCapabilityBias.get(hourKey(hour, capabilityId)) ?? 0;
}

export function getPreferenceWeightSnapshot(now: Date = new Date()): PreferenceWeightSnapshot {
  const capabilities: Record<string, PreferenceWeightEntry> = {};
  for (const [id, entry] of capabilityWeights) {
    capabilities[id] = { ...entry };
  }
  const channelBiasOut: Partial<Record<LearningChannel, number>> = {};
  for (const [channel, value] of channelBias) {
    channelBiasOut[channel] = value;
  }
  return {
    contractVersion: LEARNING_CONTRACT_VERSION,
    computedAt: now.toISOString(),
    capabilities,
    channelBias: channelBiasOut,
  };
}

export function resetPreferenceWeightsForTests(): void {
  capabilityWeights.clear();
  channelBias.clear();
  hourCapabilityBias.clear();
}
