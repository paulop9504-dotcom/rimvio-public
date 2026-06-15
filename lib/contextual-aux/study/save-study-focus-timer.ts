import {
  FIXED_CALENDAR_CONTAINER_ID,
} from "@/lib/knowledge/knowledge-entity-types";
import { saveKnowledgeEntity } from "@/lib/knowledge/knowledge-entity-db";

export type StudyFocusTimerPayload = {
  mode: "count_up";
  category: "study";
  startedAt: string;
  label: string;
};

export function formatStudyFocusStartClock(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function buildStudyFocusTimerPayload(now = new Date()): StudyFocusTimerPayload {
  const startedAt = now.toISOString();
  const clock = formatStudyFocusStartClock(startedAt);
  return {
    mode: "count_up",
    category: "study",
    startedAt,
    label: `공부 · ${clock} 시작`,
  };
}

/** Persist count-up study focus session to calendar knowledge container. */
export async function saveStudyFocusTimerToCalendar(now = new Date()) {
  const payload = buildStudyFocusTimerPayload(now);
  await saveKnowledgeEntity({
    containerId: FIXED_CALENDAR_CONTAINER_ID,
    type: "schedule",
    label: payload.label,
    value: JSON.stringify(payload),
    sourceMessage: "집중 공부 타이머",
    scheduledAt: payload.startedAt,
  });
  return payload;
}
