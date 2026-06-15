import { formatActionTargetClock, parseActionTargetDatetime } from "@/lib/action-chat/action-countdown";
import type { ContainerOrigin, PriorityVisualState } from "@/lib/dock-feed/types";
import { CONTAINER_PRIORITY, type ContainerRoute } from "@/lib/container-rework/types";
import type { EventCandidate } from "@/lib/events/event-candidate";
import {
  NEAR_TIME_MS,
  TIMELINE_SECTION_ORDER,
  type TimelineItem,
  type TimelineProjectionContext,
  type TimelineProjectionResult,
  type TimelineSection,
  type TimelineSectionName,
  type TimelineVisualState,
} from "@/lib/timeline-projection/types";

const SILENT_SUPPRESS_REASON = "suppressed — timeline silent shadow";

type RoutedTimelineEntry = {
  route: ContainerRoute;
  event: EventCandidate | null;
  datetime: Date;
  datetimeIso: string;
};

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function containerOrigin(route: ContainerRoute): ContainerOrigin {
  if (route.primary_container === "notification_surface") {
    return "notification_surface";
  }
  if (route.primary_container === "dock") {
    return "dock";
  }
  return "timeline";
}

function priorityFromRoute(route: ContainerRoute): PriorityVisualState {
  if (route.primary_container === "notification_surface") {
    return "HIGH";
  }
  if (/\bhigh\b/u.test(route.reason)) {
    return "HIGH";
  }
  if (/\bmedium\b/u.test(route.reason)) {
    return "MEDIUM";
  }
  return "LOW";
}

function containerRank(route: ContainerRoute): number {
  const index = CONTAINER_PRIORITY.indexOf(route.primary_container);
  return index >= 0 ? index : CONTAINER_PRIORITY.length;
}

function resolveEventDatetime(event: EventCandidate | null): { date: Date; iso: string } | null {
  if (!event) {
    return null;
  }

  if (event.datetime?.trim()) {
    const date = parseActionTargetDatetime(event.datetime);
    if (date) {
      return { date, iso: event.datetime };
    }
  }

  const metadata = event.metadata;
  if (metadata && typeof metadata === "object") {
    for (const key of ["scheduledAt", "fireAt", "datetime"] as const) {
      const value = metadata[key];
      if (typeof value === "string" && value.trim()) {
        const date = parseActionTargetDatetime(value);
        if (date) {
          return { date, iso: value };
        }
      }
    }
  }

  return null;
}

function shouldRenderInTimeline(route: ContainerRoute): boolean {
  if (route.reason === SILENT_SUPPRESS_REASON) {
    return false;
  }
  if (!route.timeline) {
    return false;
  }
  return !route.suppressed_containers.includes("timeline");
}

function dedupeRoutes(routes: readonly ContainerRoute[]): ContainerRoute[] {
  const byEcId = new Map<string, ContainerRoute>();

  for (const route of routes) {
    const existing = byEcId.get(route.ecId);
    if (!existing) {
      byEcId.set(route.ecId, route);
      continue;
    }

    const keepNew =
      containerRank(route) < containerRank(existing) ||
      (containerRank(route) === containerRank(existing) &&
        route.primary_container.localeCompare(existing.primary_container) < 0);

    if (keepNew) {
      byEcId.set(route.ecId, route);
    }
  }

  return [...byEcId.values()];
}

function sectionForDate(eventDate: Date, now: Date): TimelineSectionName {
  const today = startOfDay(now);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const day = startOfDay(eventDate);

  if (day.getTime() === today.getTime()) {
    return "Today";
  }
  if (day.getTime() === tomorrow.getTime()) {
    return "Tomorrow";
  }
  if (day.getTime() > tomorrow.getTime() && day.getTime() < weekEnd.getTime()) {
    return "Week";
  }
  return "Later";
}

function visualState(
  priority: PriorityVisualState,
  eventDate: Date,
  now: Date
): TimelineVisualState {
  if (priority === "LOW") {
    return "dimmed";
  }

  const msUntil = eventDate.getTime() - now.getTime();
  const isNear = msUntil >= 0 && msUntil <= NEAR_TIME_MS;
  const isToday = sectionForDate(eventDate, now) === "Today";

  if (priority === "HIGH" && (isNear || isToday)) {
    return "expanded";
  }
  if (isNear) {
    return "expanded";
  }
  return "compact";
}

function buildTimelineItem(
  entry: RoutedTimelineEntry,
  context: TimelineProjectionContext
): TimelineItem {
  const now = context.now ?? new Date();
  const priority = priorityFromRoute(entry.route);
  const origin = containerOrigin(entry.route);

  return {
    ecId: entry.route.ecId,
    title: entry.event?.title?.trim() || entry.route.ecId,
    time_label: formatActionTargetClock(entry.datetimeIso),
    startAt: entry.datetimeIso,
    visual_state: visualState(priority, entry.datetime, now),
    priority,
    container_origin: origin,
  };
}

function sortItems(items: TimelineItem[], datetimes: Map<string, Date>): TimelineItem[] {
  return [...items].sort((left, right) => {
    const originRank = (origin: ContainerOrigin) => {
      if (origin === "notification_surface") {
        return 0;
      }
      if (origin === "dock") {
        return 1;
      }
      return 2;
    };

    const originDelta = originRank(left.container_origin) - originRank(right.container_origin);
    if (originDelta !== 0) {
      return originDelta;
    }

    const leftTime = datetimes.get(left.ecId)?.getTime() ?? 0;
    const rightTime = datetimes.get(right.ecId)?.getTime() ?? 0;
    if (leftTime !== rightTime) {
      return leftTime - rightTime;
    }

    return left.ecId.localeCompare(right.ecId);
  });
}

function groupIntoSections(
  entries: RoutedTimelineEntry[],
  context: TimelineProjectionContext
): TimelineSection[] {
  const now = context.now ?? new Date();
  const datetimes = new Map(entries.map((entry) => [entry.route.ecId, entry.datetime]));
  const buckets = new Map<TimelineSectionName, TimelineItem[]>();

  for (const name of TIMELINE_SECTION_ORDER) {
    buckets.set(name, []);
  }

  for (const entry of entries) {
    const section = sectionForDate(entry.datetime, now);
    buckets.get(section)!.push(buildTimelineItem(entry, context));
  }

  return TIMELINE_SECTION_ORDER.flatMap((section) => {
    const items = sortItems(buckets.get(section) ?? [], datetimes);
    if (items.length === 0) {
      return [];
    }
    return [{ section, items }];
  });
}

function buildEntries(
  routes: readonly ContainerRoute[],
  resolveEvent: (ecId: string) => EventCandidate | null
): RoutedTimelineEntry[] {
  return dedupeRoutes(routes)
    .filter(shouldRenderInTimeline)
    .map((route) => {
      const event = resolveEvent(route.ecId);
      const resolved = resolveEventDatetime(event);
      if (!resolved) {
        return null;
      }
      return {
        route,
        event,
        datetime: resolved.date,
        datetimeIso: resolved.iso,
      };
    })
    .filter((entry): entry is RoutedTimelineEntry => entry != null)
    .sort((left, right) => {
      const timeDelta = left.datetime.getTime() - right.datetime.getTime();
      if (timeDelta !== 0) {
        return timeDelta;
      }
      return left.route.ecId.localeCompare(right.route.ecId);
    });
}

function verifyProjection(
  sections: TimelineSection[],
  entries: RoutedTimelineEntry[]
): boolean {
  const ecIds = sections.flatMap((section) => section.items.map((item) => item.ecId));
  if (new Set(ecIds).size !== ecIds.length) {
    return false;
  }

  if (ecIds.length !== entries.length) {
    return false;
  }

  for (const section of sections) {
    for (let index = 1; index < section.items.length; index += 1) {
      const prev = section.items[index - 1]!;
      const current = section.items[index]!;
      if (prev.container_origin !== "notification_surface" && current.container_origin === "notification_surface") {
        return false;
      }
    }
  }

  return true;
}

function computeProjection(
  routes: readonly ContainerRoute[],
  resolveEvent: (ecId: string) => EventCandidate | null,
  context: TimelineProjectionContext
): TimelineProjectionResult {
  const entries = buildEntries(routes, resolveEvent);
  if (entries.length === 0) {
    return [];
  }

  const sections = groupIntoSections(entries, context);
  if (!verifyProjection(sections, entries)) {
    return [];
  }

  return sections;
}

function projectionsEqual(left: TimelineProjectionResult, right: TimelineProjectionResult): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

/**
 * Project Container Rework routes into a time-ordered timeline view (display only).
 * Does NOT score, route, mutate events, or write schedule/SSOT.
 * @see docs/TIMELINE_PROJECTION.md
 */
export function composeTimelineProjection(
  routes: readonly ContainerRoute[],
  resolveEvent: (ecId: string) => EventCandidate | null,
  context: TimelineProjectionContext = {}
): TimelineProjectionResult {
  if (!Array.isArray(routes) || routes.length === 0) {
    return [];
  }

  const passA = computeProjection(routes, resolveEvent, context);
  const passB = computeProjection(routes, resolveEvent, context);

  if (!projectionsEqual(passA, passB)) {
    return [];
  }

  return passA;
}

export type { TimelineItem, TimelineProjectionContext, TimelineProjectionResult, TimelineSection };
