import { parseActionTargetDatetime } from "@/lib/action-chat/action-countdown";
import type { EventBehaviorPolicy } from "@/lib/behavior-engine/types";
import {
  isImminentFromReason,
  isWithinTwoHoursFromReason,
} from "@/lib/behavior-engine/types";
import type { ContainerReworkEntry, ContainerRoute, UiContainer } from "@/lib/container-rework/types";
import type { EventCandidate } from "@/lib/events/event-candidate";
import { minutesUntilDatetime } from "@/lib/events/event-lifecycle";
import type { EventOpportunitySignal } from "@/lib/opportunity-engine/types";
import type {
  EventNarration,
  NarrationContext,
  NarrationReasonTag,
  NarrationResult,
} from "@/lib/narration-engine/types";

const SILENT_SUPPRESS_REASON = "suppressed — timeline silent shadow";

type PhraseParts = {
  clauses: string[];
  tags: NarrationReasonTag[];
};

function dedupeTags(tags: NarrationReasonTag[]): NarrationReasonTag[] {
  return [...new Set(tags)];
}

function subjectLabel(event: EventCandidate | null): string {
  const title = event?.title?.trim();
  if (!title) {
    return "이 일정";
  }
  if (/일정|약속|미팅|회의/u.test(title)) {
    return title;
  }
  return `${title} 일정`;
}

function temporalPhrase(
  opportunity: EventOpportunitySignal | undefined,
  event: EventCandidate | null,
  context: NarrationContext
): PhraseParts {
  const clauses: string[] = [];
  const tags: NarrationReasonTag[] = [];
  const reason = opportunity?.reason ?? "";
  const nowMs = context.now?.getTime() ?? Date.now();

  if (event?.lifecycle === "active" || /\bactive now\b/u.test(reason)) {
    clauses.push("지금 진행 중이고");
    tags.push("active_now");
  } else if (event?.lifecycle === "scheduled") {
    tags.push("scheduled");
  }

  if (isImminentFromReason(reason)) {
    clauses.push("시간이 코앞으로 다가와서");
    tags.push("time_sensitive");
  } else if (isWithinTwoHoursFromReason(reason)) {
    clauses.push("곧 시작되고");
    tags.push("time_sensitive");
  } else if (event?.datetime) {
    const minutes = minutesUntilDatetime(event.datetime, nowMs);
    if (minutes != null && minutes > 0 && minutes <= 24 * 60) {
      clauses.push("오늘 또는 내일로 가까워졌고");
      tags.push("time_sensitive");
    } else if (minutes != null && minutes > 24 * 60 && minutes <= 7 * 24 * 60) {
      clauses.push("이번 주 일정이라");
      tags.push("time_sensitive");
    }
  }

  if (/\bapproaching\b/u.test(reason) && clauses.length === 0) {
    clauses.push("일정이 가까워졌고");
    tags.push("time_sensitive");
  }

  return { clauses, tags };
}

function behavioralPhrase(behavior: EventBehaviorPolicy | undefined): PhraseParts {
  if (!behavior || behavior.suppress) {
    return { clauses: [], tags: [] };
  }

  switch (behavior.highlight) {
    case "HIGH":
      return {
        clauses: [behavior.auto_nudge ? "중요한 일정이라" : "우선순위가 높아서"],
        tags: ["high_priority"],
      };
    case "MEDIUM":
      return {
        clauses: ["확인할 가치가 있어서"],
        tags: ["medium_priority"],
      };
    case "LOW":
      return {
        clauses: ["참고하시면 좋아서"],
        tags: ["low_priority"],
      };
    default:
      return { clauses: [], tags: [] };
  }
}

function contextPhrase(ecId: string, context: NarrationContext): PhraseParts {
  const clauses: string[] = [];
  const tags: NarrationReasonTag[] = [];

  const focused = context.focusedEcId?.trim();
  if (focused && focused === ecId) {
    clauses.push("지금 보고 계신");
    tags.push("in_focus");
  }

  if ((context.recentEcIds ?? []).includes(ecId)) {
    clauses.push("최근 자주 확인한 일정이라");
    tags.push("recent_interaction");
  }

  return { clauses, tags };
}

function containerPhrase(primary: UiContainer): PhraseParts {
  switch (primary) {
    case "notification_surface":
      return {
        clauses: ["알림으로 먼저 알려드리고 있어요"],
        tags: ["notification_nudge"],
      };
    case "dock":
      return {
        clauses: ["홈에서 바로 보시도록 올려두었어요"],
        tags: ["dock_display"],
      };
    case "timeline":
      return {
        clauses: ["일정 흐름에서 확인하실 수 있게 보여드리고 있어요"],
        tags: ["timeline_display"],
      };
    default:
      return {
        clauses: ["지금 보여드리고 있어요"],
        tags: [],
      };
  }
}

function joinClauses(clauses: string[]): string {
  const filtered = clauses.map((item) => item.trim()).filter(Boolean);
  if (filtered.length === 0) {
    return "지금 보여드리고 있어요";
  }
  return filtered.join(" ");
}

function buildExplanation(
  entry: ContainerReworkEntry,
  route: ContainerRoute,
  event: EventCandidate | null,
  context: NarrationContext
): EventNarration {
  const temporal = temporalPhrase(entry.opportunity, event, context);
  const behavioral = behavioralPhrase(entry.behavior);
  const userContext = contextPhrase(entry.ecId, context);
  const container = containerPhrase(route.primary_container);

  const middle = joinClauses([
    ...temporal.clauses,
    ...behavioral.clauses,
    ...userContext.clauses,
  ]);

  const ending = container.clauses[0] ?? "지금 보여드리고 있어요";
  const label = subjectLabel(event);
  const explanation = `${label}은 ${middle} ${ending}.`.replace(/\s+/g, " ");

  return {
    ecId: entry.ecId,
    explanation,
    reason_tags: dedupeTags([
      ...temporal.tags,
      ...behavioral.tags,
      ...userContext.tags,
      ...container.tags,
    ]),
  };
}

function isExplainable(route: ContainerRoute): boolean {
  if (route.reason === SILENT_SUPPRESS_REASON) {
    return false;
  }
  if (route.notification_surface) {
    return true;
  }
  if (route.dock && !route.suppressed_containers.includes("dock")) {
    return true;
  }
  if (route.timeline && !route.suppressed_containers.includes("timeline")) {
    return true;
  }
  return false;
}

function routeMap(routes: readonly ContainerRoute[]): Map<string, ContainerRoute> {
  return new Map(routes.map((route) => [route.ecId, route]));
}

function entryMap(entries: readonly ContainerReworkEntry[]): Map<string, ContainerReworkEntry> {
  return new Map(entries.map((entry) => [entry.ecId, entry]));
}

function computeNarrations(
  entries: readonly ContainerReworkEntry[],
  routes: readonly ContainerRoute[],
  resolveEvent: (ecId: string) => EventCandidate | null,
  context: NarrationContext
): NarrationResult {
  const routesByEcId = routeMap(routes);
  const entriesByEcId = entryMap(entries);

  const explainableEcIds = [...routesByEcId.values()]
    .filter(isExplainable)
    .map((route) => route.ecId)
    .sort((left, right) => left.localeCompare(right));

  return explainableEcIds.map((ecId) => {
    const route = routesByEcId.get(ecId)!;
    const entry = entriesByEcId.get(ecId) ?? { ecId };
    const event = resolveEvent(ecId);
    return buildExplanation(entry, route, event, context);
  });
}

function narrationsEqual(left: NarrationResult, right: NarrationResult): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

/**
 * Generate human-readable explanations for visible UI items.
 * Does NOT decide visibility, score, or mutate events.
 */
export function composeNarrations(
  entries: readonly ContainerReworkEntry[],
  routes: readonly ContainerRoute[],
  resolveEvent: (ecId: string) => EventCandidate | null,
  context: NarrationContext = {}
): NarrationResult {
  if (!Array.isArray(entries) || !Array.isArray(routes) || routes.length === 0) {
    return [];
  }

  const passA = computeNarrations(entries, routes, resolveEvent, context);
  const passB = computeNarrations(entries, routes, resolveEvent, context);

  if (!narrationsEqual(passA, passB)) {
    return [];
  }

  return passA.filter((item) => item.explanation.trim().length > 0);
}

export type { EventNarration, NarrationContext, NarrationResult };
