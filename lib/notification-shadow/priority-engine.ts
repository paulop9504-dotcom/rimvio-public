import type { CanonicalContainerKey } from "@/lib/containers/container-types";
import {
  extractFutureActions,
  hasActionableFuture,
} from "@/lib/notification-shadow/action-extract";
import { ruleClassifyNotification } from "@/lib/notification-shadow/rule-classify";
import type {
  BehaviorProfile,
  NotificationEventInput,
  ShadowRouteTier,
} from "@/lib/notification-shadow/types";
import {
  ACTIONABLE_BOOST,
  CONTAINER_BOOST_MATCH,
  ROUTE_THRESHOLDS,
} from "@/lib/notification-shadow/types";

function minutesUntil(iso: string | null | undefined, now = Date.now()): number | null {
  if (!iso) {
    return null;
  }
  const ms = new Date(iso).getTime() - now;
  if (Number.isNaN(ms)) {
    return null;
  }
  return Math.round(ms / 60_000);
}

function timeSensitivityScore(input: NotificationEventInput, now = Date.now()): number {
  const blob = `${input.title} ${input.content}`;
  const parsed = blob.match(/(\d+)\s*분\s*(?:전|뒤|후)/);
  if (parsed?.[1]) {
    const mins = Number.parseInt(parsed[1], 10);
    if (mins <= 5) {
      return 18;
    }
    if (mins <= 15) {
      return 12;
    }
    if (mins <= 60) {
      return 6;
    }
  }

  const until = minutesUntil(input.fire_at, now);
  if (until == null) {
    return 0;
  }
  if (until <= 0) {
    return 15;
  }
  if (until <= 5) {
    return 18;
  }
  if (until <= 15) {
    return 12;
  }
  if (until <= 60) {
    return 6;
  }
  return 0;
}

function behaviorAffinityScore(
  profile: BehaviorProfile | undefined,
  sourceApp: string,
  container: CanonicalContainerKey | "UNKNOWN",
  category: string
): number {
  if (!profile) {
    return 0;
  }
  let score = 0;
  const appKey = sourceApp.toLowerCase();
  score += profile.appAffinity?.[appKey] ?? profile.appAffinity?.[sourceApp] ?? 0;
  if (container !== "UNKNOWN") {
    score += profile.containerAffinity?.[container] ?? 0;
  }
  const cat = profile.categoryEngagement?.[category as keyof typeof profile.categoryEngagement];
  if (typeof cat === "number") {
    score += cat;
  }
  return Math.min(20, score);
}

function activeContainerBoost(
  active: CanonicalContainerKey | null | undefined,
  target: CanonicalContainerKey | "UNKNOWN"
): number {
  if (!active || target === "UNKNOWN") {
    return 0;
  }
  return active === target ? CONTAINER_BOOST_MATCH : 0;
}

export function computePriorityScore(input: {
  event: NotificationEventInput;
  container: CanonicalContainerKey | "UNKNOWN";
  future_actions: ReturnType<typeof extractFutureActions>;
  now?: number;
}): number {
  const classified = ruleClassifyNotification(input.event);
  if (classified.category === "SPAM") {
    return 0;
  }

  let score = classified.base_urgency;
  score += timeSensitivityScore(input.event, input.now);
  score += behaviorAffinityScore(
    input.event.behavior_profile,
    input.event.source_app,
    input.container,
    classified.category
  );
  score += activeContainerBoost(input.event.active_container, input.container);

  if (hasActionableFuture(input.future_actions)) {
    score += ACTIONABLE_BOOST;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function routeFromScore(
  score: number,
  category: ReturnType<typeof ruleClassifyNotification>["category"]
): ShadowRouteTier {
  if (category === "SPAM" || score <= 0) {
    return "drop";
  }
  if (score >= ROUTE_THRESHOLDS.popup) {
    return "popup";
  }
  if (score >= ROUTE_THRESHOLDS.action_stream) {
    return "action_stream";
  }
  return "shadow";
}

export function resolveContainer(
  input: NotificationEventInput
): CanonicalContainerKey | "UNKNOWN" {
  const classified = ruleClassifyNotification(input);
  if (classified.container_hint !== "UNKNOWN") {
    return classified.container_hint;
  }
  if (input.active_container) {
    return input.active_container;
  }
  return "UNKNOWN";
}
