import { parseActionTargetDatetime } from "@/lib/action-chat/action-countdown";
import type {
  ActionEventEvaluated,
  ActionEventKind,
  ActionEventLifecycle,
  ActionEventRecord,
} from "@/lib/action-event-registry/types";

const DEFAULT_ACTIVE_WINDOW_MIN = 60;
const AIRPORT_ACTIVE_WINDOW_MIN = 180;

export function detectActionEventKind(task: string, placeName: string | null): ActionEventKind {
  const blob = `${task} ${placeName ?? ""}`;
  if (/(?:공항|airport|항공|인천|김포|ICN|GMP|탑승|체크인)/iu.test(blob)) {
    return "airport_travel";
  }
  return "generic";
}

export function activeWindowMinutesForKind(kind: ActionEventKind): number {
  return kind === "airport_travel" ? AIRPORT_ACTIVE_WINDOW_MIN : DEFAULT_ACTIVE_WINDOW_MIN;
}

export function evaluateActionEventLifecycle(
  event: ActionEventRecord,
  now: Date = new Date()
): ActionEventEvaluated {
  const target = parseActionTargetDatetime(event.targetTimeIso);
  const nowMs = now.getTime();
  const activeWindowMinutes = activeWindowMinutesForKind(event.kind);

  if (!target) {
    return {
      ...event,
      lifecycle: "ARCHIVED",
      minutesUntil: -9999,
      activeWindowMinutes,
    };
  }

  const minutesUntil = Math.round((target.getTime() - nowMs) / 60_000);
  let lifecycle: ActionEventLifecycle;

  if (minutesUntil < 0) {
    lifecycle = "ARCHIVED";
  } else if (minutesUntil <= activeWindowMinutes) {
    lifecycle = "ACTIVE";
  } else {
    lifecycle = "WARM";
  }

  return {
    ...event,
    lifecycle,
    minutesUntil,
    activeWindowMinutes,
  };
}

/** Re-evaluate all non-archived events; archived entries are kept for 48h then pruned by store. */
export function evaluateActionEventRegistry(
  events: ActionEventRecord[],
  now: Date = new Date()
): ActionEventEvaluated[] {
  return events
    .map((event) => evaluateActionEventLifecycle(event, now))
    .filter((event) => event.lifecycle !== "ARCHIVED")
    .sort((left, right) => left.targetTimeIso.localeCompare(right.targetTimeIso));
}

export function toActionEventWire(event: ActionEventEvaluated): import("@/lib/action-event-registry/types").ActionEventWire {
  return {
    id: event.id,
    task: event.task,
    place_name: event.placeName,
    target_time_iso: event.targetTimeIso,
    kind: event.kind,
    lifecycle: event.lifecycle,
    priority: event.priority,
    minutes_until: event.minutesUntil,
  };
}
