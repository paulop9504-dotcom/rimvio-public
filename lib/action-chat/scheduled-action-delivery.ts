import { buildActionsFromConfirmationData } from "@/lib/action-chat/build-confirmation-actions";
import { sanitizePlaceNameForNavigation } from "@/lib/action-chat/resolve-navigation-place";
import type { ConfirmationExtractedData } from "@/lib/action-chat/confirmation-types";
import { parseActionTargetDatetime } from "@/lib/action-chat/action-countdown";
import { saveKnowledgeEntity } from "@/lib/knowledge/knowledge-entity-db";
import { FIXED_CALENDAR_CONTAINER_ID } from "@/lib/knowledge/knowledge-entity-types";
import type { LinkActionItem } from "@/types/database";

export type ScheduledActionDelivery = {
  fire_at: string;
  status: "pending" | "fired";
};

export function isFutureScheduledDatetime(iso: string | null | undefined): boolean {
  const target = parseActionTargetDatetime(iso);
  if (!target) {
    return false;
  }
  return target.getTime() > Date.now() + 5_000;
}

export function buildScheduledPlaceNavActions(
  extracted: ConfirmationExtractedData,
  sourceMessage?: string | null
): LinkActionItem[] {
  const placeName = sanitizePlaceNameForNavigation(extracted.place_name, sourceMessage);
  return buildActionsFromConfirmationData(
    {
      ...extracted,
      place_name: placeName,
      datetime: null,
    },
    sourceMessage
  ).filter((action) => !/일정\s*추가|calendar/i.test(action.label));
}

export function formatScheduledDeliverySummary(input: {
  placeLabel: string;
  fireAt: string;
  jit?: boolean;
}): string {
  const target = parseActionTargetDatetime(input.fireAt);
  if (!target) {
    return `${input.placeLabel} 일정을 캘린더에 넣어뒀어요.`;
  }

  if (input.jit) {
    const clock = target.toLocaleTimeString("ko-KR", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    return `${input.placeLabel} ${clock} 일정을 저장했어요. 출발 직전에 교통·날씨를 보고 알림을 보낼게요.`;
  }

  const remainingMs = target.getTime() - Date.now();
  const minutes = Math.max(1, Math.round(remainingMs / 60_000));
  return `${minutes}분 뒤 ${input.placeLabel} 일정을 캘린더에 넣어뒀어요. 시간되면 길찾기를 꺼낼게요.`;
}

export function formatJITScheduledFireSummary(input: {
  placeLabel: string;
  summary: string;
}): string {
  return input.summary || `${input.placeLabel} 가실 시간이에요!`;
}

export function formatScheduledFireSummary(placeLabel: string): string {
  return `${placeLabel} 가실 시간이에요!`;
}

export async function saveScheduledTravelToCalendar(input: {
  extracted: ConfirmationExtractedData;
  sourceMessage: string;
}) {
  const label =
    input.extracted.place_name ??
    input.extracted.address ??
    input.extracted.schedule_note ??
    "일정";
  const value = input.extracted.datetime;
  if (!value) {
    return null;
  }

  const saved = await saveKnowledgeEntity({
    containerId: FIXED_CALENDAR_CONTAINER_ID,
    type: "schedule",
    label,
    value,
    sourceMessage: input.sourceMessage,
  });
  return saved;
}

export function shouldDeferActionsForSchedule(extracted: ConfirmationExtractedData): boolean {
  if (!extracted.datetime || !isFutureScheduledDatetime(extracted.datetime)) {
    return false;
  }
  return Boolean(extracted.place_name || extracted.address || extracted.schedule_note?.trim());
}
