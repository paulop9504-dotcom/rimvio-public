import type { AttentionState } from "@/lib/context-builder/types";
import type { VisibilitySurface } from "@/lib/visibility-bridge/types";
import {
  DEFAULT_SURFACE_BIAS,
  TIMELINE_LONG_DWELL_MS,
  type CurrentSystemState,
  type EventFeedbackLoopInput,
  type EventFeedbackLoopResult,
  type SurfaceBiasMap,
  type UserInteractionAction,
  type UserInteractionEvent,
} from "@/lib/event-feedback-loop/types";

function clamp01(value: number): number {
  if (value <= 0) {
    return 0;
  }
  if (value >= 1) {
    return 1;
  }
  return value;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function suppressionKey(opportunityId: string): string {
  if (opportunityId.startsWith("opp:")) {
    const parts = opportunityId.split(":");
    if (parts[1]) {
      return parts[1];
    }
  }
  return opportunityId;
}

function normalizeSurfaceBias(
  surfaceBias: CurrentSystemState["surfaceBias"]
): SurfaceBiasMap {
  return {
    CALENDAR: clamp01(surfaceBias.CALENDAR ?? DEFAULT_SURFACE_BIAS),
    DOCK: clamp01(surfaceBias.DOCK ?? DEFAULT_SURFACE_BIAS),
    TIMELINE: clamp01(surfaceBias.TIMELINE ?? DEFAULT_SURFACE_BIAS),
    NARRATION: clamp01(surfaceBias.NARRATION ?? DEFAULT_SURFACE_BIAS),
  };
}

function sortEvents(events: readonly UserInteractionEvent[]): UserInteractionEvent[] {
  return [...events].sort((left, right) => {
    if (left.timestamp !== right.timestamp) {
      return left.timestamp - right.timestamp;
    }
    if (left.opportunityId !== right.opportunityId) {
      return left.opportunityId.localeCompare(right.opportunityId);
    }
    return left.action.localeCompare(right.action);
  });
}

function suppressionDelta(action: UserInteractionAction): number {
  switch (action) {
    case "DISMISS":
      return 0.3;
    case "IGNORE":
      return 0.1;
    case "CLICK":
      return -0.15;
    case "COMPLETE":
      return -0.4;
    case "HOVER_LONG":
      return -0.05;
    default:
      return 0;
  }
}

function applySuppressionUpdate(
  suppressionMap: Record<string, number>,
  event: UserInteractionEvent
): void {
  const key = suppressionKey(event.opportunityId);
  const current = suppressionMap[key] ?? 0;
  suppressionMap[key] = round2(clamp01(current + suppressionDelta(event.action)));
}

function surfaceBiasDelta(event: UserInteractionEvent): number {
  const { surface, action, dwellTime = 0 } = event;

  if (surface === "CALENDAR" && action === "COMPLETE") {
    return 0.08;
  }

  if (surface === "DOCK" && (action === "IGNORE" || action === "DISMISS")) {
    return -0.06;
  }

  if (surface === "TIMELINE" && action === "HOVER_LONG" && dwellTime >= TIMELINE_LONG_DWELL_MS) {
    return 0.07;
  }

  if (surface === "TIMELINE" && action === "COMPLETE") {
    return 0.05;
  }

  if (surface === "NARRATION" && (action === "IGNORE" || action === "DISMISS")) {
    return -0.04;
  }

  if (action === "CLICK" || action === "COMPLETE") {
    return 0.03;
  }

  if (action === "IGNORE" || action === "DISMISS") {
    return -0.03;
  }

  if (action === "HOVER_LONG") {
    return 0.02;
  }

  return 0;
}

function applySurfaceBiasUpdate(surfaceBias: SurfaceBiasMap, event: UserInteractionEvent): void {
  const delta = surfaceBiasDelta(event);
  surfaceBias[event.surface] = round2(clamp01(surfaceBias[event.surface] + delta));
}

type InteractionMetrics = {
  total: number;
  ignored: number;
  completed: number;
  engaged: number;
  surfaceSwitches: number;
  dockIgnored: number;
  calendarCompleted: number;
  calendarDismissed: number;
  timelineEngaged: number;
  narrationIgnored: number;
};

function buildInteractionMetrics(events: readonly UserInteractionEvent[]): InteractionMetrics {
  const metrics: InteractionMetrics = {
    total: events.length,
    ignored: 0,
    completed: 0,
    engaged: 0,
    surfaceSwitches: 0,
    dockIgnored: 0,
    calendarCompleted: 0,
    calendarDismissed: 0,
    timelineEngaged: 0,
    narrationIgnored: 0,
  };

  let previousSurface: VisibilitySurface | null = null;

  for (const event of events) {
    if (event.action === "IGNORE" || event.action === "DISMISS") {
      metrics.ignored += 1;
    }
    if (event.action === "COMPLETE") {
      metrics.completed += 1;
      metrics.engaged += 1;
    }
    if (event.action === "CLICK" || event.action === "HOVER_LONG") {
      metrics.engaged += 1;
    }

    if (event.surface === "DOCK" && (event.action === "IGNORE" || event.action === "DISMISS")) {
      metrics.dockIgnored += 1;
    }
    if (event.surface === "CALENDAR" && event.action === "COMPLETE") {
      metrics.calendarCompleted += 1;
    }
    if (event.surface === "CALENDAR" && event.action === "DISMISS") {
      metrics.calendarDismissed += 1;
    }
    if (
      event.surface === "TIMELINE" &&
      (event.action === "COMPLETE" ||
        (event.action === "HOVER_LONG" && (event.dwellTime ?? 0) >= TIMELINE_LONG_DWELL_MS))
    ) {
      metrics.timelineEngaged += 1;
    }
    if (event.surface === "NARRATION" && (event.action === "IGNORE" || event.action === "DISMISS")) {
      metrics.narrationIgnored += 1;
    }

    if (previousSurface != null && previousSurface !== event.surface) {
      metrics.surfaceSwitches += 1;
    }
    previousSurface = event.surface;
  }

  return metrics;
}

function recalculateAttentionState(
  current: AttentionState,
  metrics: InteractionMetrics
): AttentionState {
  if (metrics.total === 0) {
    return current;
  }

  const completionRate = metrics.completed / metrics.total;
  const ignoreRate = metrics.ignored / metrics.total;
  const engagementRate = metrics.engaged / metrics.total;
  const switchRate = metrics.surfaceSwitches / Math.max(metrics.total - 1, 1);

  if (metrics.total <= 1 && engagementRate === 0) {
    return "IDLE";
  }

  if (engagementRate <= 0.15 && metrics.total <= 2) {
    return "IDLE";
  }

  if (switchRate >= 0.6 || (metrics.ignored >= 2 && ignoreRate >= 0.5)) {
    return "SCATTERED";
  }

  if (completionRate >= 0.35 && switchRate <= 0.35) {
    return "FOCUSED";
  }

  if (ignoreRate >= 0.5) {
    return "SCATTERED";
  }

  if (engagementRate <= 0.2) {
    return "IDLE";
  }

  return current;
}

function buildDriftSignals(metrics: InteractionMetrics): string[] {
  const signals: string[] = [];

  if (metrics.dockIgnored >= 2) {
    signals.push("dock_overloaded");
  }

  if (metrics.calendarCompleted >= 1 && metrics.calendarDismissed === 0) {
    signals.push("calendar_high_trust");
  }

  if (metrics.timelineEngaged >= 1) {
    signals.push("timeline_engaged");
  }

  if (metrics.narrationIgnored >= 1) {
    signals.push("narration_ignored");
  }

  if (metrics.surfaceSwitches >= 3) {
    signals.push("attention_fragmentation");
  }

  return signals.sort((left, right) => left.localeCompare(right));
}

function cloneSuppressionMap(map: Record<string, number>): Record<string, number> {
  return { ...map };
}

/** EventFeedbackLoop v1 — user interaction signals → behavioral memory updates. */
export function processEventFeedback(input: EventFeedbackLoopInput): EventFeedbackLoopResult {
  const { events, state } = input;
  const orderedEvents = sortEvents(events);
  const updatedSuppressionMap = cloneSuppressionMap(state.suppressionMap);
  const updatedSurfaceBias = normalizeSurfaceBias(state.surfaceBias);

  for (const event of orderedEvents) {
    applySuppressionUpdate(updatedSuppressionMap, event);
    applySurfaceBiasUpdate(updatedSurfaceBias, event);
  }

  const metrics = buildInteractionMetrics(orderedEvents);
  const attentionState = recalculateAttentionState(state.attentionState, metrics);
  const driftSignals = buildDriftSignals(metrics);

  return {
    updatedSuppressionMap,
    updatedSurfaceBias,
    attentionState,
    driftSignals,
  };
}
