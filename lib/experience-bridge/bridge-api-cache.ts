import { invalidateCachedFetch } from "@/lib/http/client-fetch-cache";

/** Align with useBridgeMediaSync ACTIVE_POLL_MS — dedupe concurrent plan fetches. */
export const BRIDGE_PLAN_CACHE_MS = 5_000;

/** Align with usePendingBridgeInvites POLL_MS. */
export const BRIDGE_INVITES_CACHE_MS = 12_000;

export const BRIDGE_CONTRIBUTIONS_CACHE_MS = 5_000;

export const BRIDGE_SLOTS_CACHE_MS = 15_000;

export function bridgePlanCacheKey(eventId: string): string {
  return `bridge:plan:${eventId.trim()}`;
}

export function bridgeContributionsCacheKey(eventId: string): string {
  return `bridge:contributions:${eventId.trim()}`;
}

export const BRIDGE_INVITES_CACHE_KEY = "bridge:invites";

export const PEER_FEED_SLOTS_CACHE_KEY = "peer:feed:slots";

/** Call after bridge mutations (invite, accept, media publish). */
export function invalidateBridgeApiCache(eventId?: string | null): void {
  invalidateCachedFetch(BRIDGE_INVITES_CACHE_KEY);
  const key = eventId?.trim();
  if (key) {
    invalidateCachedFetch(bridgePlanCacheKey(key));
    invalidateCachedFetch(bridgeContributionsCacheKey(key));
  }
}
