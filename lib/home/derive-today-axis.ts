import { CANONICAL_CONTAINER_REGISTRY } from "@/lib/containers/container-types";
import { listContainers } from "@/lib/container-store/containers-store";
import { countEventsByContainerSince } from "@/lib/container-store/events-store";

const RECENT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export type TodayAxisCard = {
  containerId: string;
  title: string;
  lastActiveAt: string;
  eventCount: number;
  accent: string;
  kind: "canonical" | "context" | "place";
};

export function deriveTodayAxisCards(limit = 6): TodayAxisCard[] {
  const eventCounts = countEventsByContainerSince(RECENT_WINDOW_MS);
  const now = Date.now();

  return listContainers({ status: "active" })
    .map((container) => {
      const preset =
        CANONICAL_CONTAINER_REGISTRY[
          container.id as keyof typeof CANONICAL_CONTAINER_REGISTRY
        ];
      const eventCount = eventCounts.get(container.id) ?? 0;
      const lastActiveMs = new Date(container.last_active_at).getTime();
      const recentlyActive = now - lastActiveMs <= RECENT_WINDOW_MS;

      return {
        containerId: container.id,
        title: container.title,
        lastActiveAt: container.last_active_at,
        eventCount,
        accent: preset?.accent ?? "#4A90E2",
        kind: container.kind,
        recentlyActive,
        score: lastActiveMs + eventCount * 60_000,
      };
    })
    .filter(
      (card) =>
        card.kind === "context" ||
        card.eventCount > 0 ||
        card.recentlyActive
    )
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ containerId, title, lastActiveAt, eventCount, accent, kind }) => ({
      containerId,
      title,
      lastActiveAt,
      eventCount,
      accent,
      kind,
    }));
}

export function formatAxisLastActive(iso: string): string {
  const delta = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(delta / 60_000);
  if (minutes < 1) {
    return "방금";
  }
  if (minutes < 60) {
    return `${minutes}분 전`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}시간 전`;
  }
  const days = Math.floor(hours / 24);
  return `${days}일 전`;
}
