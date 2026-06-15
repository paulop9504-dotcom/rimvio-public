import type { BehaviorContext } from "@/lib/intent/kernel-types";
import { analyzeCrossLinkMemory } from "@/lib/intent/cross-link-memory";
import {
  collectContextBehaviorSignals,
  resolveInteractionMode,
} from "@/lib/intent/context-signals-behavior";
import {
  computeTrajectoryEnergy,
  trajectorySignalDelta,
} from "@/lib/intent/trajectory-energy";
import type { SignalEntry } from "@/lib/screenshot/signal-ledger";

export function collectBehaviorSignals(context: BehaviorContext = {}, now = Date.now()) {
  const history = context.saveHistory ?? [];
  const hour = context.hour ?? new Date(now).getHours();

  const trajectory = computeTrajectoryEnergy(history, now);
  const contextBehavior = collectContextBehaviorSignals({
    hour,
    saveHistory: history,
    now,
  });
  const crossLink = analyzeCrossLinkMemory({
    current: context.current ?? {},
    saveHistory: history,
    now,
  });

  const signals: SignalEntry[] = [
    ...contextBehavior.signals,
    ...crossLink.signals.map((entry) => ({ id: entry.id, delta: entry.delta })),
  ];

  const trajectoryDelta = trajectorySignalDelta(trajectory.strength);
  if (trajectoryDelta > 0) {
    signals.push({
      id: `trajectory_${trajectory.dominant_cluster}`,
      delta: trajectoryDelta,
    });
  }

  return {
    trajectory,
    context_signal_ids: contextBehavior.signalIds,
    interaction_mode: resolveInteractionMode(contextBehavior.signalIds),
    cross_link: {
      related_count: crossLink.related_count,
      pattern: crossLink.pattern,
    },
    signals,
  };
}
