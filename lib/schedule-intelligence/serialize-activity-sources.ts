import { listSearchActivitiesSync } from "@/lib/location-memory/search-activity-log";
import { listShadowRecords } from "@/lib/notification-shadow/shadow-store";
import type { ScheduleActivityWire } from "@/lib/schedule-intelligence/types";

/** Client snapshot for Deep Retrieval stage 3 (activity + notification log). */
export function serializeActivitySourcesForRetrieval(): ScheduleActivityWire[] {
  if (typeof window === "undefined") {
    return [];
  }

  const shadow: ScheduleActivityWire[] = listShadowRecords()
    .slice(0, 100)
    .map((record) => ({
      id: record.id,
      title: record.raw.title,
      text: `${record.raw.title} ${record.raw.content}`.trim(),
      timestamp: record.ingested_at,
      fireAt: record.raw.fire_at ?? null,
      source: "notification_shadow" as const,
    }));

  const search: ScheduleActivityWire[] = listSearchActivitiesSync(50).map((entry) => ({
    id: entry.id,
    title: entry.query,
    text: `${entry.query} ${entry.place_label ?? ""}`.trim(),
    timestamp: entry.createdAt,
    fireAt: null,
    source: "search_activity" as const,
  }));

  return [...shadow, ...search];
}
