import type { CapabilityId } from "@/lib/capability-registry/capability-types";
import type { LearningObservation } from "@/lib/learning/learning-contract";
import type { DetectedPattern } from "@/lib/learning/learning-types";

const HABIT_WINDOW_MS = 6 * 60 * 60 * 1000;

/**
 * Deterministic pattern extraction from observation stream — no LLM.
 */
export function detectPatterns(observations: readonly LearningObservation[]): DetectedPattern[] {
  const patterns: DetectedPattern[] = [];
  const byCapability = new Map<CapabilityId, number>();
  const byChannel = new Map<string, number>();
  const byHour = new Map<number, Map<CapabilityId, number>>();
  let retrySignals = 0;

  for (const row of observations) {
    byCapability.set(row.capabilityId, (byCapability.get(row.capabilityId) ?? 0) + 1);
    const channel = row.contextSnapshot.channel;
    if (channel) {
      byChannel.set(channel, (byChannel.get(channel) ?? 0) + 1);
    }
    const hour = row.contextSnapshot.hourBucket ?? 0;
    if (!byHour.has(hour)) {
      byHour.set(hour, new Map());
    }
    const hourMap = byHour.get(hour)!;
    hourMap.set(row.capabilityId, (hourMap.get(row.capabilityId) ?? 0) + 1);
    if (row.actionType === "retry_signal") {
      retrySignals += 1;
    }
  }

  const sortedCaps = [...byCapability.entries()].sort((a, b) => b[1] - a[1]);
  if (sortedCaps[0] && sortedCaps[0][1] >= 3) {
    patterns.push({
      kind: "capability_habit",
      capabilityId: sortedCaps[0][0],
      strength: Math.min(1, sortedCaps[0][1] / 10),
      sampleCount: sortedCaps[0][1],
    });
  }

  const sortedChannels = [...byChannel.entries()].sort((a, b) => b[1] - a[1]);
  if (sortedChannels[0] && sortedChannels[0][1] >= 2) {
    patterns.push({
      kind: "channel_preference",
      channel: sortedChannels[0][0] as DetectedPattern["channel"],
      strength: Math.min(1, sortedChannels[0][1] / 8),
      sampleCount: sortedChannels[0][1],
    });
  }

  let bestHour: { hour: number; cap: CapabilityId; count: number } | null = null;
  for (const [hour, caps] of byHour) {
    const top = [...caps.entries()].sort((a, b) => b[1] - a[1])[0];
    if (!top) {
      continue;
    }
    if (!bestHour || top[1] > bestHour.count) {
      bestHour = { hour, cap: top[0], count: top[1] };
    }
  }
  if (bestHour && bestHour.count >= 2) {
    patterns.push({
      kind: "time_of_day_shift",
      capabilityId: bestHour.cap,
      hourBucket: bestHour.hour,
      strength: Math.min(1, bestHour.count / 6),
      sampleCount: bestHour.count,
    });
  }

  if (retrySignals >= 2) {
    patterns.push({
      kind: "retry_friction",
      strength: Math.min(1, retrySignals / 5),
      sampleCount: retrySignals,
    });
  }

  const habit = detectRapidHabit(observations);
  if (habit) {
    patterns.push(habit);
  }

  return patterns;
}

function detectRapidHabit(observations: readonly LearningObservation[]): DetectedPattern | null {
  const executes = observations
    .filter((row) => row.actionType === "execute" && row.resultStatus === "success")
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  if (executes.length < 3) {
    return null;
  }

  const last = executes[executes.length - 1]!;
  const windowStart = Date.parse(last.timestamp) - HABIT_WINDOW_MS;
  const inWindow = executes.filter((row) => Date.parse(row.timestamp) >= windowStart);
  if (inWindow.length < 3) {
    return null;
  }

  const sameCap = inWindow.every((row) => row.capabilityId === inWindow[0]!.capabilityId);
  if (!sameCap) {
    return null;
  }

  return {
    kind: "capability_habit",
    capabilityId: inWindow[0]!.capabilityId,
    strength: 0.85,
    sampleCount: inWindow.length,
  };
}
