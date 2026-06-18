"use client";

import type { EventCandidate } from "@/lib/events/event-candidate";
import { readFeedCaptureFragments } from "@/lib/feed/feed-capture-metadata";
import {
  FEED_CAPTURES_META_KEY,
  type FeedCaptureFragment,
} from "@/lib/feed/feed-capture-types";
import type { ExperienceBridgeContribution } from "@/lib/experience-bridge/experience-bridge-types";
import { isUsableBridgeMediaUrl } from "@/lib/experience-bridge/bridge-media-url";
import { dedupeBridgeFeedCaptures } from "@/lib/experience-bridge/dedupe-bridge-feed-captures";
import { commitEventUpsert } from "@/lib/source-of-truth/commit-truth";

function mergeCaptureUrls(
  local: FeedCaptureFragment,
  remote: FeedCaptureFragment,
): FeedCaptureFragment {
  let next = local;
  if (isUsableBridgeMediaUrl(remote.url) && !isUsableBridgeMediaUrl(local.url)) {
    next = { ...next, url: remote.url!.trim() };
  }
  if (!next.ownerUserId && remote.ownerUserId) {
    next = {
      ...next,
      ownerUserId: remote.ownerUserId,
      authorDisplayName: remote.authorDisplayName ?? next.authorDisplayName,
      authorAvatarUrl: remote.authorAvatarUrl ?? next.authorAvatarUrl,
    };
  }
  return next;
}

function commitCaptureMerge(
  event: EventCandidate,
  merged: FeedCaptureFragment[],
): EventCandidate {
  return commitEventUpsert({
    id: event.id,
    title: event.title,
    category: event.category,
    source: event.source,
    lifecycle: event.lifecycle,
    datetime: event.datetime,
    place: event.place,
    containerId: event.containerId,
    confidence: event.confidence,
    metadata: {
      ...event.metadata,
      [FEED_CAPTURES_META_KEY]: dedupeBridgeFeedCaptures(merged),
    },
    lifecycleUpdatedAt: event.lifecycleUpdatedAt ?? new Date().toISOString(),
  });
}

/** Invitee — pull https capture urls from server bridge snapshot. */
export function mergeBridgeRemoteCaptureUrls(input: {
  event: EventCandidate;
  remoteEvent: EventCandidate;
}): EventCandidate | null {
  const localCaptures = readFeedCaptureFragments(input.event);
  const remoteCaptures = readFeedCaptureFragments(input.remoteEvent);
  if (remoteCaptures.length === 0) {
    return null;
  }

  const remoteById = new Map(remoteCaptures.map((row) => [row.id, row]));
  const localIds = new Set(localCaptures.map((row) => row.id));
  let changed = false;
  const merged = localCaptures.map((capture) => {
    const remote = remoteById.get(capture.id);
    if (!remote) {
      return capture;
    }
    const next = mergeCaptureUrls(capture, remote);
    if (
      next.url !== capture.url ||
      next.ownerUserId !== capture.ownerUserId ||
      next.authorDisplayName !== capture.authorDisplayName ||
      next.authorAvatarUrl !== capture.authorAvatarUrl
    ) {
      changed = true;
    }
    return next;
  });

  for (const remote of remoteCaptures) {
    if (localIds.has(remote.id)) {
      continue;
    }
    if (remote.kind !== "photo" && remote.kind !== "video") {
      continue;
    }
    if (!isUsableBridgeMediaUrl(remote.url)) {
      continue;
    }
    merged.push(remote);
    localIds.add(remote.id);
    changed = true;
  }

  if (!changed) {
    return null;
  }

  return commitCaptureMerge(input.event, merged);
}

function contributionMetaByCaptureId(
  contributions: readonly ExperienceBridgeContribution[],
): Map<
  string,
  {
    ownerUserId: string;
    authorDisplayName?: string;
    authorAvatarUrl?: string;
    url?: string;
  }
> {
  const out = new Map<
    string,
    {
      ownerUserId: string;
      authorDisplayName?: string;
      authorAvatarUrl?: string;
      url?: string;
    }
  >();
  for (const row of contributions) {
    const capture = row.capture;
    const id = capture?.id?.trim();
    if (!id) {
      continue;
    }
    const url = capture.url?.trim();
    out.set(id, {
      ownerUserId: row.contributorUserId,
      authorDisplayName: capture.authorDisplayName?.trim() || undefined,
      authorAvatarUrl: capture.authorAvatarUrl?.trim() || undefined,
      url: isUsableBridgeMediaUrl(url) ? url : undefined,
    });
  }
  return out;
}

/** Merge other members' bridge contributions into local event for pin reel. */
export function mergeBridgeContributionsIntoEvent(input: {
  event: EventCandidate;
  contributions: readonly ExperienceBridgeContribution[];
  viewerUserId?: string | null;
}): EventCandidate | null {
  if (input.contributions.length === 0) {
    return null;
  }

  const localCaptures = readFeedCaptureFragments(input.event);
  const localIds = new Set(localCaptures.map((row) => row.id));
  const viewerId = input.viewerUserId?.trim() || null;
  const remoteByCaptureId = contributionMetaByCaptureId(input.contributions);

  let changed = false;
  const upgraded = localCaptures.map((capture) => {
    const remote = remoteByCaptureId.get(capture.id);
    if (!remote) {
      return capture;
    }
    let next = capture;
    if (remote.url && !isUsableBridgeMediaUrl(next.url)) {
      next = { ...next, url: remote.url };
      changed = true;
    }
    if (
      remote.authorDisplayName &&
      remote.authorDisplayName !== next.authorDisplayName
    ) {
      next = {
        ...next,
        authorDisplayName: remote.authorDisplayName,
        authorAvatarUrl: remote.authorAvatarUrl ?? next.authorAvatarUrl,
      };
      changed = true;
    }
    if (!next.ownerUserId) {
      next = {
        ...next,
        ownerUserId: remote.ownerUserId,
        authorDisplayName: remote.authorDisplayName ?? next.authorDisplayName,
        authorAvatarUrl: remote.authorAvatarUrl ?? next.authorAvatarUrl,
      };
      changed = true;
    }
    return next;
  });

  const extras: FeedCaptureFragment[] = [];
  for (const row of input.contributions) {
    const capture = row.capture;
    if (!capture?.id?.trim() || localIds.has(capture.id)) {
      continue;
    }
    if (viewerId && row.contributorUserId === viewerId) {
      continue;
    }
    if (capture.kind !== "photo" && capture.kind !== "video") {
      continue;
    }
    if (!isUsableBridgeMediaUrl(capture.url)) {
      continue;
    }
    extras.push({
      id: capture.id,
      kind: capture.kind,
      capturedAtIso: capture.capturedAtIso,
      mediaContextId: capture.mediaContextId,
      placeLabel: capture.placeLabel,
      label: capture.label,
      url: capture.url,
      ownerUserId: row.contributorUserId,
      authorDisplayName: capture.authorDisplayName,
      authorAvatarUrl: capture.authorAvatarUrl,
    });
    localIds.add(capture.id);
    changed = true;
  }

  if (!changed) {
    return null;
  }

  return commitCaptureMerge(input.event, [...upgraded, ...extras]);
}
