import {
  BURST_THRESHOLD,
  recentTrajectorySaves,
} from "@/lib/intent/burst-session";
import type { SaveTrajectoryEntry } from "@/lib/intent/kernel-types";
import type { SignalEntry } from "@/lib/screenshot/signal-ledger";

const HOUR_MS = 60 * 60 * 1000;

function recentWithin(history: SaveTrajectoryEntry[], ms: number, now = Date.now()) {
  return history.filter(
    (entry) => now - new Date(entry.timestamp).getTime() <= ms
  );
}

export function collectContextBehaviorSignals(input: {
  hour: number;
  saveHistory: SaveTrajectoryEntry[];
  now?: number;
}): { signalIds: string[]; signals: SignalEntry[] } {
  const now = input.now ?? Date.now();
  const signals: SignalEntry[] = [];
  const signalIds: string[] = [];

  const push = (id: string, delta: number) => {
    signalIds.push(id);
    signals.push({ id, delta });
  };

  if (input.hour >= 22 || input.hour < 6) {
    push("late_night_activity", 8);
  }

  const burstWindow = recentTrajectorySaves(input.saveHistory, now);
  if (burstWindow.length >= BURST_THRESHOLD) {
    push("save_burst", 14);
  }

  const lastHour = recentWithin(input.saveHistory, HOUR_MS, now);

  if (lastHour.length >= 1) {
    push("session_active", 8);
  }

  const domains = new Map<string, number>();
  for (const entry of lastHour) {
    const domain = entry.domain?.trim();
    if (!domain) {
      continue;
    }
    domains.set(domain, (domains.get(domain) ?? 0) + 1);
  }

  for (const count of domains.values()) {
    if (count >= 2) {
      push("repeat_domain", 10);
      break;
    }
  }

  const categories = new Map<string, number>();
  for (const entry of lastHour) {
    const category = entry.category?.trim() || "unknown";
    categories.set(category, (categories.get(category) ?? 0) + 1);
  }

  for (const count of categories.values()) {
    if (count >= 2) {
      push("comparison_pattern", 10);
      break;
    }
  }

  if (lastHour.length === 0) {
    push("quick_capture", 4);
  } else if (lastHour.length >= 4) {
    push("focused_research", 8);
  } else if (lastHour.length <= 1) {
    push("passive_browse", 4);
  }

  return { signalIds, signals };
}

export function resolveInteractionMode(signalIds: string[]): import("@/lib/intent/kernel-types").InteractionMode {
  if (signalIds.includes("comparison_pattern") || signalIds.includes("repeat_domain")) {
    return "comparison";
  }
  if (signalIds.includes("focused_research") || signalIds.includes("save_burst")) {
    return "focused_research";
  }
  if (signalIds.includes("quick_capture")) {
    return "quick_capture";
  }
  if (signalIds.includes("passive_browse")) {
    return "passive_browse";
  }
  return "uncertain";
}
