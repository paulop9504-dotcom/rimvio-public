import type { LinkRow } from "@/types/database";
import { saveKnowledgeEntity } from "@/lib/knowledge/knowledge-entity-db";
import { FIXED_CALENDAR_CONTAINER_ID } from "@/lib/knowledge/knowledge-entity-types";
import {
  clearReminderByLinkId,
  requestReminderPermission,
  scheduleLinkReminderAt,
} from "@/lib/local-links/reminders";

/** Active — schedule link reminder on Action Stream. */
export async function promoteLinkToActionStream(link: LinkRow, fireAtIso: string) {
  const fireAt = new Date(fireAtIso);
  if (Number.isNaN(fireAt.getTime())) {
    throw new Error("invalid_fire_at");
  }
  if (fireAt.getTime() <= Date.now() + 30_000) {
    throw new Error("fire_at_past");
  }

  await requestReminderPermission();

  scheduleLinkReminderAt({
    linkId: link.id,
    title: link.title,
    url: link.original_url,
    fireAt: fireAtIso,
  });

  await saveKnowledgeEntity({
    containerId: FIXED_CALENDAR_CONTAINER_ID,
    type: "schedule",
    label: link.title?.trim() || "예약된 링크",
    value: link.original_url,
    sourceLinkId: link.id,
    scheduledAt: fireAtIso,
    sourceMessage: fireAtIso,
  });
}

/** Stop link reminder — link stays in feed. */
export function demoteLinkFromActionStream(linkId: string) {
  clearReminderByLinkId(linkId);
}

export function buildFireAtFromDateTime(date: string, time: string) {
  const [hour, minute] = time.split(":");
  return `${date}T${hour?.padStart(2, "0") ?? "09"}:${minute ?? "00"}:00`;
}
