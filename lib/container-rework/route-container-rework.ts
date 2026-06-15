import type { EventBehaviorPolicy } from "@/lib/behavior-engine/types";
import type { NotificationExecutionDecision } from "@/lib/notification-shadow/types";
import {
  isValidContainerEcId,
  suppressedExcept,
  type ContainerReworkEntry,
  type ContainerReworkResult,
  type ContainerRoute,
  type ContainerUiState,
  type UiContainer,
} from "@/lib/container-rework/types";

function isBehaviorSuppressed(behavior?: EventBehaviorPolicy): boolean {
  return Boolean(behavior?.suppress);
}

function routeFromBehaviorHighlight(
  highlight: EventBehaviorPolicy["highlight"],
  behavior: EventBehaviorPolicy,
  notification: NotificationExecutionDecision | undefined
): ContainerRoute {
  const { ecId } = behavior;

  if (highlight === "HIGH" && behavior.auto_nudge) {
    const useNotification =
      Boolean(notification?.send_notification && !notification.suppress_final) &&
      notification?.timing === "immediate";

    if (useNotification) {
      return {
        ecId,
        primary_container: "notification_surface",
        dock: false,
        chat: false,
        timeline: true,
        notification_surface: true,
        suppressed_containers: suppressedExcept(["notification_surface", "timeline"]),
        reason: "high nudge — notification primary",
      };
    }

    return {
      ecId,
      primary_container: "dock",
      dock: behavior.show_in_dock,
      chat: false,
      timeline: true,
      notification_surface: false,
      suppressed_containers: suppressedExcept(["dock", "timeline"]),
      reason: "high nudge — dock primary",
    };
  }

  if (highlight === "HIGH") {
    return {
      ecId,
      primary_container: "dock",
      dock: behavior.show_in_dock,
      chat: false,
      timeline: true,
      notification_surface: false,
      suppressed_containers: suppressedExcept(["dock", "timeline"]),
      reason: "high highlight — dock primary",
    };
  }

  if (highlight === "MEDIUM") {
    return {
      ecId,
      primary_container: "dock",
      dock: behavior.show_in_dock,
      chat: false,
      timeline: true,
      notification_surface: false,
      suppressed_containers: suppressedExcept(["dock", "timeline"]),
      reason: "medium — dock primary, timeline secondary",
    };
  }

  if (highlight === "LOW") {
    return {
      ecId,
      primary_container: "timeline",
      dock: false,
      chat: false,
      timeline: true,
      notification_surface: false,
      suppressed_containers: suppressedExcept(["timeline"]),
      reason: "low — timeline only",
    };
  }

  return {
    ecId,
    primary_container: "timeline",
    dock: false,
    chat: false,
    timeline: true,
    notification_surface: false,
    suppressed_containers: suppressedExcept(["timeline"]),
    reason: "none highlight — timeline shadow",
  };
}

function routeSilentTimeline(entry: ContainerReworkEntry): ContainerRoute {
  return {
    ecId: entry.ecId,
    primary_container: "timeline",
    dock: false,
    chat: false,
    timeline: true,
    notification_surface: false,
    suppressed_containers: suppressedExcept(["timeline"]),
    reason: "suppressed — timeline silent shadow",
  };
}

/** Route one ecId into UI containers — pure composition, no scoring. */
export function routeEventContainers(
  entry: ContainerReworkEntry,
  _ui: ContainerUiState = {}
): ContainerRoute | null {
  if (!isValidContainerEcId(entry.ecId)) {
    return null;
  }

  const behavior = entry.behavior;
  const notification = entry.notification;

  if (!behavior) {
    return null;
  }

  if (isBehaviorSuppressed(behavior)) {
    return routeSilentTimeline(entry);
  }

  return routeFromBehaviorHighlight(behavior.highlight, behavior, notification);
}

function resolveConflicts(routes: ContainerRoute[]): ContainerRoute[] {
  const notificationPrimaries = routes.filter(
    (route) => route.primary_container === "notification_surface" && route.notification_surface
  ).length;

  if (notificationPrimaries <= 1) {
    return routes;
  }

  let keptNotification = false;
  return routes.map((route) => {
    if (route.primary_container !== "notification_surface" || !route.notification_surface) {
      return route;
    }
    if (!keptNotification) {
      keptNotification = true;
      return route;
    }
    return {
      ...route,
      primary_container: "dock" as UiContainer,
      dock: true,
      notification_surface: false,
      suppressed_containers: [...new Set([...route.suppressed_containers, "notification_surface"])],
      reason: `${route.reason}; notification coalesced to dock`,
    };
  });
}

function stableSortRoutes(routes: ContainerRoute[]): ContainerRoute[] {
  return [...routes].sort((left, right) => left.ecId.localeCompare(right.ecId));
}

function routesEqual(left: ContainerRoute[], right: ContainerRoute[]): boolean {
  if (left.length !== right.length) {
    return false;
  }
  return JSON.stringify(stableSortRoutes(left)) === JSON.stringify(stableSortRoutes(right));
}

/**
 * Route decision layer outputs into UI containers.
 * Does NOT score, mutate events, or trigger notifications.
 */
export function routeContainerRework(
  entries: readonly ContainerReworkEntry[],
  ui: ContainerUiState = {}
): ContainerReworkResult {
  if (!Array.isArray(entries) || entries.length === 0) {
    return "NO_ACTION";
  }

  const compute = (items: readonly ContainerReworkEntry[]) =>
    resolveConflicts(
      items
        .map((item) => routeEventContainers(item, ui))
        .filter((item): item is ContainerRoute => item != null)
    );

  const passA = compute(entries);
  const passB = compute(entries);

  if (passA.length === 0) {
    return "NO_ACTION";
  }

  if (!routesEqual(passA, passB)) {
    return "NO_ACTION";
  }

  const visible = passA.filter(
    (item) => item.dock || item.chat || item.timeline || item.notification_surface
  );
  if (visible.length === 0) {
    return "NO_ACTION";
  }

  return passA;
}

export type { ContainerReworkResult, ContainerRoute, ContainerUiState };
