"use client";

import { fetchExperienceBridgeRemote, fetchBridgeContributionsRemote } from "@/lib/experience-bridge/experience-bridge-client";
import { resolveBridgePublishRole } from "@/lib/experience-bridge/ensure-bridge-link-before-publish";
import { resolveBridgeContributionsForSync } from "@/lib/experience-bridge/resolve-bridge-contributions-for-sync";
import {
  mergeBridgeContributionsIntoEvent,
  mergeBridgeRemoteCaptureUrls,
} from "@/lib/experience-bridge/merge-bridge-shared-media";
import type { ExperienceBridgeContribution } from "@/lib/experience-bridge/experience-bridge-types";
import type { EventCandidate } from "@/lib/events/event-candidate";
import { findLifeEventCandidate } from "@/lib/life-read-model";
import { stampBridgeEventMetadata } from "@/lib/experience-bridge/stamp-bridge-event-metadata";

/** Bridge pin open — merge snapshot urls + all members' contributions from server. */
export async function syncBridgeSharedMediaFromRemote(
  eventId: string,
  viewerUserId?: string | null,
): Promise<EventCandidate | null> {
  const key = eventId.trim();
  if (!key) {
    return null;
  }

  let remote: Awaited<ReturnType<typeof fetchExperienceBridgeRemote>>;
  try {
    remote = await fetchExperienceBridgeRemote(key, { fresh: true });
  } catch {
    return null;
  }

  if (!remote.state?.bridge.eventSnapshot) {
    return null;
  }

  const viewerId = viewerUserId?.trim() || null;
  const local = findLifeEventCandidate(key);
  let event =
    local ?? remote.state.bridge.eventSnapshot;
  let changed = false;

  if (viewerId) {
    const base = local ?? remote.state.bridge.eventSnapshot;
    const stamped = stampBridgeEventMetadata({
      event: base,
      bridge: remote.state.bridge,
      role: resolveBridgePublishRole({
        viewerUserId: viewerId,
        hostUserId: remote.state.bridge.hostUserId,
      }),
    });
    if (stamped !== base) {
      changed = true;
    }
    event = stamped;
  }

  const dedicatedContributions = await fetchBridgeContributionsRemote(key, {
    fresh: true,
  }).catch(() => [] as ExperienceBridgeContribution[]);
  const contributions = resolveBridgeContributionsForSync({
    fromPlan: remote.contributions ?? [],
    fromDedicated: dedicatedContributions,
  });

  const urlMerged = mergeBridgeRemoteCaptureUrls({
    event,
    remoteEvent: remote.state.bridge.eventSnapshot,
  });
  if (urlMerged) {
    event = urlMerged;
    changed = true;
  }

  const contributionMerged = mergeBridgeContributionsIntoEvent({
    event,
    contributions,
    viewerUserId,
  });
  if (contributionMerged) {
    event = contributionMerged;
    changed = true;
  }

  return changed ? event : null;
}

/** @deprecated use syncBridgeSharedMediaFromRemote */
export async function syncBridgeParticipantMediaFromRemote(
  eventId: string,
): Promise<EventCandidate | null> {
  return syncBridgeSharedMediaFromRemote(eventId);
}
