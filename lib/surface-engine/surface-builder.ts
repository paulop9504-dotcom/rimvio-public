import type { EventCandidate } from "@/lib/events/event-candidate";
import type { LifeProjections } from "@/lib/life-read-model/types";
import type { CapabilityId } from "@/lib/capability-registry/capability-types";
import type {
  Surface,
  SurfaceAction,
  SurfaceBuildContext,
  SurfaceEventRef,
  SurfaceLifecycle,
  SurfaceNarration,
  SurfaceResource,
  SurfaceType,
  SurfaceVisibility,
} from "@/lib/surface-engine/surface-contract";
import { deriveUserCoreActionLabel } from "@/lib/inside-out/user-core-action-label";
import { formatScheduleConfirmWhen } from "@/lib/peer-chat/ai-lens/resolve-schedule-datetime";
import {
  computeRawPriorityScore,
  hoursUntilEvent,
} from "@/lib/surface-engine/surface-priority";

const TRAVEL_SIGNAL =
  /(?:오사카|여행|공항|항공|출국|체크인|탑승|trip|flight|hotel|숙소)/iu;
const FOOD_SIGNAL = /(?:치킨|식당|카페|저녁|점심|만나|약속|맛집)/iu;
const GOAL_SIGNAL = /(?:창업|목표|프로젝트|시작하고|하고 싶)/iu;
const REMINDER_SIGNAL = /(?:알려|리마인|분 뒤|후에|timer|remind)/iu;

const VISIBLE_LIFECYCLES = new Set<EventCandidate["lifecycle"]>([
  "mentioned",
  "confirmed",
  "scheduled",
  "active",
]);

function surfaceIdForEvent(eventId: string): string {
  return `surface:ec:${eventId}`;
}

function actionId(surfaceId: string, capabilityId: CapabilityId): string {
  return `${surfaceId}:${capabilityId}`;
}

function isActionCompleted(
  surfaceId: string,
  capabilityId: CapabilityId,
  context: SurfaceBuildContext,
): boolean {
  const key = actionId(surfaceId, capabilityId);
  return context.completedActionIds?.includes(key) ?? false;
}

function inferSurfaceType(event: EventCandidate): SurfaceType {
  const blob = `${event.title} ${event.place ?? ""}`;
  if (event.category === "travel" || TRAVEL_SIGNAL.test(blob)) {
    return "travel";
  }
  if (REMINDER_SIGNAL.test(blob) && !event.datetime) {
    return "reminder";
  }
  if (event.category === "finance") {
    return "finance";
  }
  if (event.category === "social" || FOOD_SIGNAL.test(blob)) {
    return event.datetime ? "food" : "social";
  }
  if (GOAL_SIGNAL.test(blob)) {
    return "goal";
  }
  if (event.category === "work") {
    return "work";
  }
  if (event.datetime) {
    return "schedule";
  }
  return "generic";
}

function mapLifecycle(event: EventCandidate): SurfaceLifecycle {
  switch (event.lifecycle) {
    case "mentioned":
      return "draft";
    case "confirmed":
      return "preparing";
    case "scheduled":
    case "active":
      return "in_progress";
    case "completed":
      return "completed";
    case "archived":
      return "archived";
    default:
      return "active";
  }
}

function buildResources(event: EventCandidate): SurfaceResource[] {
  const resources: SurfaceResource[] = [];
  if (event.place?.trim()) {
    resources.push({
      id: `${event.id}:place`,
      kind: "location",
      label: event.place.trim(),
    });
  }
  const url = event.metadata?.url;
  if (typeof url === "string" && url.trim()) {
    resources.push({
      id: `${event.id}:link`,
      kind: "link",
      label: "관련 링크",
      href: url.trim(),
    });
  }
  return resources;
}

function buildEventRef(event: EventCandidate): SurfaceEventRef {
  const sourceRef =
    typeof event.metadata?.sourceRef === "string"
      ? event.metadata.sourceRef
      : undefined;

  return {
    eventId: event.id,
    title: event.title,
    startAt: event.datetime,
    lifecycle: event.lifecycle,
    sourceRef,
  };
}

/** Primary Action Engine — exactly one obvious next step per surface. */
export function selectPrimaryAction(
  event: EventCandidate,
  surfaceId: string,
  type: SurfaceType,
  context: SurfaceBuildContext,
): SurfaceAction {
  if (type === "travel") {
    if (!isActionCompleted(surfaceId, "BOOK_FLIGHT", context)) {
      return {
        id: actionId(surfaceId, "BOOK_FLIGHT"),
        kind: "primary",
        label: "✈️ 항공권 예약",
        capabilityId: "BOOK_FLIGHT",
        eventId: event.id,
      };
    }
    if (!isActionCompleted(surfaceId, "BOOK_HOTEL", context)) {
      return {
        id: actionId(surfaceId, "BOOK_HOTEL"),
        kind: "primary",
        label: "🏨 숙소 예약",
        capabilityId: "BOOK_HOTEL",
        eventId: event.id,
      };
    }
    return {
      id: actionId(surfaceId, "CHECK_IN"),
      kind: "primary",
      label: "📱 체크인 준비",
      capabilityId: "CHECK_IN",
      eventId: event.id,
    };
  }

  if (type === "reminder") {
    return {
      id: actionId(surfaceId, "ALARM"),
      kind: "primary",
      label: "⏰ 알림 맞추기",
      capabilityId: "ALARM",
      eventId: event.id,
    };
  }

  if (type === "goal") {
    return {
      id: actionId(surfaceId, "CLARIFY_GOAL"),
      kind: "primary",
      label: "🎯 목표 정리하기",
      capabilityId: "CLARIFY_GOAL",
      eventId: event.id,
    };
  }

  if (type === "food" && event.place?.trim()) {
    return {
      id: actionId(surfaceId, "CONFIRM_PLACE"),
      kind: "primary",
      label: "📍 장소 확인",
      capabilityId: "CONFIRM_PLACE",
      eventId: event.id,
    };
  }

  const hours = hoursUntilEvent(event, context.now ?? new Date());
  if (hours !== null && hours <= 2 && hours >= -1) {
    return {
      id: actionId(surfaceId, "NAVIGATE"),
      kind: "primary",
      label: "🧭 길찾기",
      capabilityId: "NAVIGATE",
      eventId: event.id,
    };
  }

  if (event.datetime) {
    return {
      id: actionId(surfaceId, "CALENDAR"),
      kind: "primary",
      label: "📅 일정 확인",
      capabilityId: "CALENDAR",
      eventId: event.id,
    };
  }

  return {
    id: actionId(surfaceId, "OPEN_EVENT"),
    kind: "primary",
    label: "다음 단계 확인",
    capabilityId: "OPEN_EVENT",
    eventId: event.id,
  };
}

function withUserCoreLabel(
  action: SurfaceAction,
  event: EventCandidate,
): SurfaceAction {
  const label = deriveUserCoreActionLabel(event);
  if (!label) {
    return action;
  }
  return { ...action, label };
}

function buildSecondaryActions(
  event: EventCandidate,
  surfaceId: string,
  primary: SurfaceAction,
): SurfaceAction[] {
  const secondary: SurfaceAction[] = [];
  if (primary.capabilityId !== "NAVIGATE" && event.place?.trim()) {
    secondary.push({
      id: actionId(surfaceId, "NAVIGATE"),
      kind: "secondary",
      label: "길찾기",
      capabilityId: "NAVIGATE",
      eventId: event.id,
    });
  }
  if (primary.capabilityId !== "CALL") {
    secondary.push({
      id: actionId(surfaceId, "CALL"),
      kind: "secondary",
      label: "연락하기",
      capabilityId: "CALL",
      eventId: event.id,
    });
  }
  secondary.push({
    id: actionId(surfaceId, "DISMISS_SURFACE"),
    kind: "secondary",
    label: "나중에",
    capabilityId: "DISMISS_SURFACE",
    eventId: event.id,
  });
  return secondary.slice(0, 4);
}

function buildDescription(event: EventCandidate, type: SurfaceType): string {
  const place = event.place?.trim();
  if (type === "travel") {
    return place ? `${place} 여행 준비` : "여행 준비를 이어가세요";
  }
  if (type === "food" && place) {
    return `${place}에서의 약속`;
  }
  if (event.datetime) {
    return formatScheduleConfirmWhen(event.datetime);
  }
  return "다음에 할 일을 정리했어요";
}

function buildNarration(event: EventCandidate, type: SurfaceType): SurfaceNarration | null {
  const channel =
    event.metadata && typeof event.metadata === "object"
      ? event.metadata.channel
      : undefined;
  if (channel === "peer_talk") {
    const peer =
      typeof event.metadata?.peerDisplayName === "string"
        ? event.metadata.peerDisplayName
        : "친구";
    return {
      summary: `${peer}와 나눈 대화에서 남긴 일이에요`,
      reason: "peer_talk_marble",
    };
  }
  if (type === "travel") {
    return { summary: "여행 준비 순서대로 진행하면 돼요", reason: "travel_sequence" };
  }
  if (type === "reminder") {
    return { summary: "짧은 알림이면 바로 맞출 수 있어요", reason: "reminder" };
  }
  return null;
}

function visibilityForScore(score: number, dismissed: boolean): SurfaceVisibility {
  if (dismissed) {
    return "hidden";
  }
  if (score >= 60) {
    return "prominent";
  }
  if (score >= 25) {
    return "normal";
  }
  return "muted";
}

function buildSurfaceFromEvent(
  event: EventCandidate,
  context: SurfaceBuildContext,
): Surface | null {
  if (!VISIBLE_LIFECYCLES.has(event.lifecycle)) {
    return null;
  }

  const now = context.now ?? new Date();
  const surfaceId = surfaceIdForEvent(event.id);
  const type = inferSurfaceType(event);
  const primaryAction = withUserCoreLabel(
    selectPrimaryAction(event, surfaceId, type, context),
    event,
  );
  const priorityParts = computeRawPriorityScore({
    event,
    surfaceId,
    context,
    now,
    primaryCapabilityId: primaryAction.capabilityId,
  });
  const dismissed = context.dismissedSurfaceIds?.includes(surfaceId) ?? false;

  return {
    id: surfaceId,
    type,
    title: event.title,
    description: buildDescription(event, type),
    primaryAction,
    secondaryActions: buildSecondaryActions(event, surfaceId, primaryAction),
    people: [],
    resources: buildResources(event),
    events: [buildEventRef(event)],
    narration: buildNarration(event, type),
    priority: {
      band: priorityParts.band,
      surfacePriorityScore: priorityParts.score,
      urgencyHours: priorityParts.urgencyHours,
    },
    visibility: visibilityForScore(priorityParts.score, dismissed),
    lifecycle: mapLifecycle(event),
  };
}

/**
 * Build situation surfaces from life projections only (no event-store, no capabilities).
 */
export function buildSurfacesFromLife(
  life: LifeProjections,
  context: SurfaceBuildContext = {},
): Surface[] {
  const frame: SurfaceBuildContext = {
    ...context,
    dateKey: context.dateKey ?? life.dateKey,
    now: context.now ?? new Date(),
  };

  return life.events
    .map((event) => buildSurfaceFromEvent(event, frame))
    .filter((surface): surface is Surface => surface !== null);
}
