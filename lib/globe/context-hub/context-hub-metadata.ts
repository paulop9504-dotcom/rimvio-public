import type { EventCandidate } from "@/lib/events/event-candidate";

/** Plug-in resource hubs attached to a globe context (destination) event. */
export type ContextHubKind = "departure_airport";

export const CONTEXT_HUB_IDS_META_KEY = "contextHubIds";
export const CONTEXT_HUB_KIND_META_KEY = "contextHubKind";
export const CONTEXT_HUB_PARENT_EVENT_ID_META_KEY = "contextHubParentEventId";

export function readContextHubIds(
  event: EventCandidate | null | undefined,
): string[] {
  const raw = event?.metadata?.[CONTEXT_HUB_IDS_META_KEY];
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw
    .filter((row): row is string => typeof row === "string")
    .map((row) => row.trim())
    .filter(Boolean);
}

export function readContextHubKind(
  event: EventCandidate | null | undefined,
): ContextHubKind | null {
  const kind = event?.metadata?.[CONTEXT_HUB_KIND_META_KEY];
  return kind === "departure_airport" ? kind : null;
}

export function readContextHubParentEventId(
  event: EventCandidate | null | undefined,
): string | null {
  const id = event?.metadata?.[CONTEXT_HUB_PARENT_EVENT_ID_META_KEY];
  if (typeof id !== "string") {
    return null;
  }
  const trimmed = id.trim();
  return trimmed || null;
}

export function mergeContextHubIds(
  existing: readonly string[],
  hubEventId: string,
): string[] {
  const next = new Set(existing);
  next.add(hubEventId.trim());
  return [...next];
}
