import { formatActionTargetClock } from "@/lib/action-chat/action-countdown";
import type { EventCandidate } from "@/lib/events/event-candidate";
import type { ContainerRoute } from "@/lib/container-rework/types";
import {
  DOCK_FEED_ORIGIN_RANK,
  DOCK_FEED_PRIORITY_RANK,
  type ContainerOrigin,
  type DockCard,
  type DockFeedContext,
  type DockFeedInput,
  type DockFeedResult,
  type DockRenderMode,
  type PriorityVisualState,
} from "@/lib/dock-feed/types";

const SILENT_SUPPRESS_REASON = "suppressed — timeline silent shadow";

function containerOrigin(route: ContainerRoute): ContainerOrigin {
  if (route.primary_container === "notification_surface") {
    return "notification_surface";
  }
  if (route.primary_container === "dock") {
    return "dock";
  }
  return "timeline";
}

function priorityVisualState(route: ContainerRoute): PriorityVisualState {
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

function renderMode(route: ContainerRoute): DockRenderMode {
  if (
    route.primary_container === "notification_surface" ||
    route.primary_container === "dock"
  ) {
    return "full";
  }
  if (route.primary_container === "timeline") {
    if (/\blow\b/u.test(route.reason) || /\bnone\b/u.test(route.reason)) {
      return "dimmed";
    }
    return "compact";
  }
  return "compact";
}

function shouldRenderInDock(route: ContainerRoute): boolean {
  if (route.reason === SILENT_SUPPRESS_REASON) {
    return false;
  }

  if (route.primary_container === "notification_surface" && route.notification_surface) {
    return true;
  }

  if (route.dock && route.primary_container === "dock") {
    return !route.suppressed_containers.includes("dock");
  }

  if (
    route.primary_container === "timeline" &&
    route.timeline &&
    !route.dock &&
    !route.notification_surface
  ) {
    return !route.suppressed_containers.includes("timeline");
  }

  return false;
}

function buildSubtitle(event: EventCandidate | null): string {
  if (!event) {
    return "";
  }

  const parts: string[] = [];
  if (event.datetime) {
    parts.push(formatActionTargetClock(event.datetime));
  }
  if (event.place?.trim()) {
    parts.push(event.place.trim());
  }
  if (parts.length > 0) {
    return parts.join(" · ");
  }
  return event.category;
}

function actionPreview(event: EventCandidate | null): string | undefined {
  if (!event) {
    return undefined;
  }
  if (event.lifecycle === "active") {
    return "Active";
  }
  if (event.lifecycle === "scheduled") {
    return "Scheduled";
  }
  return undefined;
}

function isHighlighted(ecId: string, context: DockFeedContext): boolean {
  const focused = context.focusedEcId?.trim();
  if (focused && focused === ecId) {
    return true;
  }
  return (context.recentEcIds ?? []).includes(ecId);
}

function buildDockCard(
  route: ContainerRoute,
  event: EventCandidate | null,
  context: DockFeedContext
): DockCard {
  const origin = containerOrigin(route);
  return {
    ecId: route.ecId,
    title: event?.title?.trim() || route.ecId,
    subtitle: buildSubtitle(event),
    priority_visual_state: priorityVisualState(route),
    container_origin: origin,
    highlight: isHighlighted(route.ecId, context),
    render_mode: renderMode(route),
    action_preview: actionPreview(event),
    reason: route.reason,
  };
}

function sortDockFeed(cards: DockCard[]): DockCard[] {
  return [...cards].sort((left, right) => {
    const originDelta =
      DOCK_FEED_ORIGIN_RANK[left.container_origin] -
      DOCK_FEED_ORIGIN_RANK[right.container_origin];
    if (originDelta !== 0) {
      return originDelta;
    }

    const priorityDelta =
      DOCK_FEED_PRIORITY_RANK[left.priority_visual_state] -
      DOCK_FEED_PRIORITY_RANK[right.priority_visual_state];
    if (priorityDelta !== 0) {
      return priorityDelta;
    }

    return left.ecId.localeCompare(right.ecId);
  });
}

function verifyFeed(cards: DockCard[], routes: readonly ContainerRoute[]): boolean {
  const ecIds = cards.map((item) => item.ecId);
  if (new Set(ecIds).size !== ecIds.length) {
    return false;
  }

  const silentIds = new Set(
    routes.filter((item) => item.reason === SILENT_SUPPRESS_REASON).map((item) => item.ecId)
  );
  if (cards.some((item) => silentIds.has(item.ecId))) {
    return false;
  }

  for (const card of cards) {
    const route = routes.find((item) => item.ecId === card.ecId);
    if (!route) {
      return false;
    }
    if (route.suppressed_containers.includes("dock") && card.container_origin === "dock") {
      return false;
    }
  }

  const sorted = sortDockFeed(cards);
  return JSON.stringify(sorted) === JSON.stringify(cards);
}

function computeFeed(
  routes: DockFeedInput,
  resolveEvent: (ecId: string) => EventCandidate | null,
  context: DockFeedContext
): DockCard[] {
  const cards = routes
    .filter(shouldRenderInDock)
    .map((route) => buildDockCard(route, resolveEvent(route.ecId), context));

  return sortDockFeed(cards);
}

function feedsEqual(left: DockCard[], right: DockCard[]): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

/**
 * Render Container Rework routes into a Netflix-style Dock feed.
 * Does NOT score, route, or mutate events.
 */
export function composeDockFeed(
  routes: DockFeedInput,
  resolveEvent: (ecId: string) => EventCandidate | null,
  context: DockFeedContext = {}
): DockFeedResult {
  if (context.dockVisible === false) {
    return [];
  }

  if (!Array.isArray(routes) || routes.length === 0) {
    return [];
  }

  const passA = computeFeed(routes, resolveEvent, context);
  const passB = computeFeed(routes, resolveEvent, context);

  if (!feedsEqual(passA, passB)) {
    return "NO_ACTION";
  }

  if (!verifyFeed(passA, routes)) {
    return "NO_ACTION";
  }

  return passA;
}

export type { DockCard, DockFeedContext, DockFeedResult };
