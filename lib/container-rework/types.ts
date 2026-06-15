import type { EventBehaviorPolicy } from "@/lib/behavior-engine/types";
import type { EventOpportunitySignal } from "@/lib/opportunity-engine/types";
import type { NotificationExecutionDecision } from "@/lib/notification-shadow/types";

export type UiContainer = "dock" | "chat" | "timeline" | "notification_surface";

/** Per-ecId decision layer bundle — read-only references. */
export type ContainerReworkEntry = {
  ecId: string;
  opportunity?: EventOpportunitySignal;
  behavior?: EventBehaviorPolicy;
  notification?: NotificationExecutionDecision;
};

export type ContainerUiState = {
  dockVisible?: boolean;
  chatVisible?: boolean;
  timelineVisible?: boolean;
  focusedEcId?: string | null;
};

export type ContainerRoute = {
  ecId: string;
  primary_container: UiContainer;
  dock: boolean;
  chat: boolean;
  timeline: boolean;
  notification_surface: boolean;
  suppressed_containers: UiContainer[];
  reason: string;
};

export type ContainerReworkResult = ContainerRoute[] | "NO_ACTION";

/** Container emphasis priority for conflict resolution. */
export const CONTAINER_PRIORITY: readonly UiContainer[] = [
  "notification_surface",
  "dock",
  "chat",
  "timeline",
];

const EC_PREFIX = /^ec-/u;

export function isValidContainerEcId(ecId: string): boolean {
  return EC_PREFIX.test(ecId.trim());
}

export function mergeDecisionEntries(input: {
  opportunities?: readonly EventOpportunitySignal[];
  behaviors?: readonly EventBehaviorPolicy[];
  notifications?: readonly NotificationExecutionDecision[];
}): ContainerReworkEntry[] {
  const map = new Map<string, ContainerReworkEntry>();

  for (const item of input.opportunities ?? []) {
    if (!isValidContainerEcId(item.ecId)) {
      continue;
    }
    const existing = map.get(item.ecId) ?? { ecId: item.ecId };
    map.set(item.ecId, { ...existing, opportunity: item });
  }

  for (const item of input.behaviors ?? []) {
    if (!isValidContainerEcId(item.ecId)) {
      continue;
    }
    const existing = map.get(item.ecId) ?? { ecId: item.ecId };
    map.set(item.ecId, { ...existing, behavior: item });
  }

  for (const item of input.notifications ?? []) {
    if (!isValidContainerEcId(item.ecId)) {
      continue;
    }
    const existing = map.get(item.ecId) ?? { ecId: item.ecId };
    map.set(item.ecId, { ...existing, notification: item });
  }

  return [...map.values()];
}

export function allContainers(): UiContainer[] {
  return ["dock", "chat", "timeline", "notification_surface"];
}

export function suppressedExcept(
  allowed: readonly UiContainer[]
): UiContainer[] {
  const allowedSet = new Set(allowed);
  return allContainers().filter((item) => !allowedSet.has(item));
}
