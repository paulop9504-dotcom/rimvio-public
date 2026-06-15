import type { EventCandidate } from "@/lib/events/event-candidate";
import { resolveAppOrigin } from "@/lib/auth/redirect-url";
import { cachedFetchJson } from "@/lib/http/client-fetch-cache";
import {
  BRIDGE_CONTRIBUTIONS_CACHE_MS,
  BRIDGE_INVITES_CACHE_KEY,
  BRIDGE_INVITES_CACHE_MS,
  BRIDGE_PLAN_CACHE_MS,
  bridgeContributionsCacheKey,
  bridgePlanCacheKey,
  invalidateBridgeApiCache,
} from "@/lib/experience-bridge/bridge-api-cache";
import type {
  ExperienceBridgeContribution,
  ExperienceBridgeState,
  ExperienceBridgeTimelineItem,
} from "@/lib/experience-bridge/experience-bridge-types";

async function parseJson<T>(response: Response): Promise<T> {
  const body = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(typeof body.error === "string" ? body.error : response.statusText);
  }
  return body;
}

async function fetchJsonUncached<T>(
  endpoint: string,
  init?: RequestInit,
): Promise<T> {
  return parseJson<T>(await fetch(endpoint, { credentials: "include", ...init }));
}

export async function fetchExperienceBridgeRemote(eventId: string): Promise<{
  state: ExperienceBridgeState | null;
  timeline: ExperienceBridgeTimelineItem[];
  contributions: ExperienceBridgeContribution[];
}> {
  const key = eventId.trim();
  const endpoint = `${resolveAppOrigin()}/api/experience-bridge/${encodeURIComponent(key)}`;
  return cachedFetchJson(bridgePlanCacheKey(key), () => fetchJsonUncached(endpoint), BRIDGE_PLAN_CACHE_MS);
}

export async function fetchBridgeContributionsRemote(
  eventId: string,
): Promise<ExperienceBridgeContribution[]> {
  const key = eventId.trim();
  const endpoint = `${resolveAppOrigin()}/api/experience-bridge/${encodeURIComponent(key)}/contributions`;
  const body = await cachedFetchJson(
    bridgeContributionsCacheKey(key),
    () => fetchJsonUncached<{ contributions?: ExperienceBridgeContribution[] }>(endpoint),
    BRIDGE_CONTRIBUTIONS_CACHE_MS,
  );
  return body.contributions ?? [];
}

export async function bootstrapExperienceBridgeRemote(input: {
  event: EventCandidate;
  peerThreadId?: string | null;
  hostDisplayName?: string;
}): Promise<{ state: ExperienceBridgeState }> {
  const endpoint = `${resolveAppOrigin()}/api/experience-bridge/${encodeURIComponent(input.event.id)}`;
  const result = await fetchJsonUncached<{ state: ExperienceBridgeState }>(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "bootstrap",
      primaryEvent: input.event,
      peerThreadId: input.peerThreadId,
      hostDisplayName: input.hostDisplayName,
    }),
  });
  invalidateBridgeApiCache(input.event.id);
  return result;
}

export async function inviteExperienceBridgeRemote(input: {
  eventId: string;
  event?: EventCandidate;
  peerThreadId?: string | null;
  hostDisplayName?: string;
  participantUserId: string;
  participantDisplayName: string;
}): Promise<{ state: ExperienceBridgeState }> {
  const endpoint = `${resolveAppOrigin()}/api/experience-bridge/${encodeURIComponent(input.eventId)}`;
  const result = await fetchJsonUncached<{ state: ExperienceBridgeState }>(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "invite",
      primaryEvent: input.event,
      peerThreadId: input.peerThreadId,
      hostDisplayName: input.hostDisplayName,
      participantUserId: input.participantUserId,
      participantDisplayName: input.participantDisplayName,
    }),
  });
  invalidateBridgeApiCache(input.eventId);
  return result;
}

export async function acceptExperienceBridgeRemote(eventId: string): Promise<{
  state: ExperienceBridgeState;
  pinSpec: { bridge: ExperienceBridgeState["bridge"]; peerThreadId: string | null };
}> {
  const endpoint = `${resolveAppOrigin()}/api/experience-bridge/${encodeURIComponent(eventId)}/accept`;
  const result = await fetchJsonUncached<{
    state: ExperienceBridgeState;
    pinSpec: { bridge: ExperienceBridgeState["bridge"]; peerThreadId: string | null };
  }>(endpoint, { method: "POST" });
  invalidateBridgeApiCache(eventId);
  return result;
}

export async function leaveExperienceBridgeRemote(eventId: string): Promise<{
  state: ExperienceBridgeState;
}> {
  const endpoint = `${resolveAppOrigin()}/api/experience-bridge/${encodeURIComponent(eventId)}/leave`;
  const result = await fetchJsonUncached<{ state: ExperienceBridgeState }>(endpoint, {
    method: "POST",
  });
  invalidateBridgeApiCache(eventId);
  return result;
}

export async function declineExperienceBridgeRemote(eventId: string): Promise<{
  state: ExperienceBridgeState;
}> {
  const endpoint = `${resolveAppOrigin()}/api/experience-bridge/${encodeURIComponent(eventId)}/decline`;
  const result = await fetchJsonUncached<{ state: ExperienceBridgeState }>(endpoint, {
    method: "POST",
  });
  invalidateBridgeApiCache(eventId);
  return result;
}

export async function fetchPendingBridgeInvitesRemote(): Promise<{
  invites: Array<{
    state: ExperienceBridgeState;
    invite: ExperienceBridgeState["participants"][number];
  }>;
}> {
  const endpoint = `${resolveAppOrigin()}/api/experience-bridge/invites`;
  return cachedFetchJson(
    BRIDGE_INVITES_CACHE_KEY,
    () => fetchJsonUncached(endpoint),
    BRIDGE_INVITES_CACHE_MS,
  );
}

export type PeerThreadMemberRow = {
  userId: string;
  displayName: string;
};

export async function fetchPeerThreadMembersRemote(
  threadId: string,
): Promise<PeerThreadMemberRow[]> {
  const endpoint = `${resolveAppOrigin()}/api/peers/threads/${encodeURIComponent(threadId)}/members`;
  const data = await fetchJsonUncached<{ members: PeerThreadMemberRow[] }>(endpoint);
  return data.members ?? [];
}

export { invalidateBridgeApiCache };
