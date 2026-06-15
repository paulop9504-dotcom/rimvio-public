import type { EventCandidate } from "@/lib/events/event-candidate";
import type {
  FeedCaptureFragment,
  FeedCaptureKind,
  FeedCaptureStats,
} from "@/lib/feed/feed-capture-types";
import {
  FEED_CAPTURES_META_KEY,
  FEED_CAPTURE_PENDING_VERIFY_META_KEY,
  FEED_CAPTURE_STATS_META_KEY,
  FEED_CAPTURE_VERIFIED_AT_META_KEY,
} from "@/lib/feed/feed-capture-types";

function isCaptureKind(value: unknown): value is FeedCaptureKind {
  return (
    value === "photo" ||
    value === "video" ||
    value === "link" ||
    value === "memo" ||
    value === "gps_dwell"
  );
}

export function readFeedCaptureFragments(
  event: EventCandidate | null | undefined,
): FeedCaptureFragment[] {
  const raw = event?.metadata?.[FEED_CAPTURES_META_KEY];
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
    .filter((item) => typeof item.id === "string" && typeof item.capturedAtIso === "string")
    .map((item) => ({
      id: item.id as string,
      kind: isCaptureKind(item.kind) ? item.kind : "memo",
      capturedAtIso:
        typeof item.capturedAtIso === "string"
          ? item.capturedAtIso
          : new Date().toISOString(),
      mediaContextId:
        typeof item.mediaContextId === "string" ? item.mediaContextId : undefined,
      placeLabel: typeof item.placeLabel === "string" ? item.placeLabel : undefined,
      label: typeof item.label === "string" ? item.label : undefined,
      url: typeof item.url === "string" ? item.url : undefined,
      dwellMinutes:
        typeof item.dwellMinutes === "number" ? item.dwellMinutes : undefined,
      autoAttached: item.autoAttached === true,
      verified: item.verified === true,
      ownerUserId:
        typeof item.ownerUserId === "string" ? item.ownerUserId : undefined,
      authorDisplayName:
        typeof item.authorDisplayName === "string"
          ? item.authorDisplayName
          : undefined,
      authorAvatarUrl:
        typeof item.authorAvatarUrl === "string"
          ? item.authorAvatarUrl
          : undefined,
    }));
}

/** After bridge upload — persist https url on the local event capture row. */
export function patchFeedCaptureRemoteUrl(input: {
  event: EventCandidate;
  captureId: string;
  url: string;
}): EventCandidate | null {
  const captureId = input.captureId.trim();
  const url = input.url.trim();
  if (!captureId || !url) {
    return null;
  }

  const captures = readFeedCaptureFragments(input.event);
  let changed = false;
  const next = captures.map((row) => {
    if (row.id !== captureId && row.mediaContextId?.trim() !== captureId) {
      return row;
    }
    if (row.url === url) {
      return row;
    }
    changed = true;
    return { ...row, url };
  });

  if (!changed) {
    return null;
  }

  return {
    ...input.event,
    metadata: {
      ...input.event.metadata,
      [FEED_CAPTURES_META_KEY]: next,
    },
    updatedAt: new Date().toISOString(),
  };
}

/** Persist uploader identity on a capture row (bridge share). */
export function patchFeedCaptureAuthor(input: {
  event: EventCandidate;
  captureId: string;
  ownerUserId?: string;
  authorDisplayName?: string;
  authorAvatarUrl?: string;
}): EventCandidate | null {
  const captureId = input.captureId.trim();
  if (!captureId) {
    return null;
  }

  const captures = readFeedCaptureFragments(input.event);
  let changed = false;
  const next = captures.map((row) => {
    if (row.id !== captureId && row.mediaContextId?.trim() !== captureId) {
      return row;
    }
    const patched = {
      ...row,
      ...(input.ownerUserId ? { ownerUserId: input.ownerUserId } : {}),
      ...(input.authorDisplayName
        ? { authorDisplayName: input.authorDisplayName }
        : {}),
      ...(input.authorAvatarUrl ? { authorAvatarUrl: input.authorAvatarUrl } : {}),
    };
    if (
      patched.ownerUserId === row.ownerUserId &&
      patched.authorDisplayName === row.authorDisplayName &&
      patched.authorAvatarUrl === row.authorAvatarUrl
    ) {
      return row;
    }
    changed = true;
    return patched;
  });

  if (!changed) {
    return null;
  }

  return {
    ...input.event,
    metadata: {
      ...input.event.metadata,
      [FEED_CAPTURES_META_KEY]: next,
    },
    updatedAt: new Date().toISOString(),
  };
}

export function readDwellMinutesFromCaptures(
  event: EventCandidate | null | undefined,
): number | null {
  const dwells = readFeedCaptureFragments(event)
    .filter((fragment) => fragment.kind === "gps_dwell")
    .map((fragment) => fragment.dwellMinutes)
    .filter((value): value is number => typeof value === "number" && value > 0);
  if (dwells.length === 0) {
    const meta = event?.metadata?.gpsDwellMinutes;
    return typeof meta === "number" && meta > 0 ? meta : null;
  }
  return dwells.reduce((sum, minutes) => sum + minutes, 0);
}

export function wasFeedCaptureHumanVerified(
  metadata: Record<string, unknown> | undefined,
): boolean {
  return typeof metadata?.[FEED_CAPTURE_VERIFIED_AT_META_KEY] === "string";
}

export function hasPendingFeedCaptureVerify(
  event: EventCandidate | null | undefined,
): boolean {
  if (!event) {
    return false;
  }
  if (event.metadata?.[FEED_CAPTURE_PENDING_VERIFY_META_KEY] === true) {
    return true;
  }
  if (event.metadata?.targetingSource === "gps_background") {
    return false;
  }
  return readFeedCaptureFragments(event).some(
    (fragment) => fragment.autoAttached && !fragment.verified,
  );
}

export function countUnverifiedFeedCaptures(
  event: EventCandidate | null | undefined,
): number {
  return readFeedCaptureFragments(event).filter(
    (fragment) => fragment.autoAttached && !fragment.verified,
  ).length;
}

export function buildFeedCaptureVerifyLabel(
  event: EventCandidate | null | undefined,
): string {
  const pending = countUnverifiedFeedCaptures(event);
  const stats = readFeedCaptureStats(event);
  const parts: string[] = ["맞아요"];
  const dwell = readDwellMinutesFromCaptures(event);
  if (stats.photos > 0) {
    parts.push(`📷 ${stats.photos}`);
  } else if (stats.videos > 0) {
    parts.push(`영상 ${stats.videos}`);
  } else if (dwell !== null) {
    parts.push(`${dwell}분 체류`);
  } else if (stats.links > 0) {
    parts.push(`링크 ${stats.links}`);
  } else if (stats.memos > 0) {
    parts.push(`메모 ${stats.memos}`);
  } else if (pending > 0) {
    parts.push(`${pending}개`);
  }
  return parts.join(" · ");
}

export function markFeedCapturesVerified(
  metadata: Record<string, unknown> | undefined,
): Record<string, unknown> {
  const next = { ...(metadata ?? {}) };
  const fragments = readFeedCaptureFragments({ metadata: next } as EventCandidate).map(
    (fragment) => ({
      ...fragment,
      verified: true,
    }),
  );
  next[FEED_CAPTURES_META_KEY] = fragments;
  next[FEED_CAPTURE_PENDING_VERIFY_META_KEY] = false;
  next[FEED_CAPTURE_VERIFIED_AT_META_KEY] = new Date().toISOString();
  return next;
}

export function readFeedCaptureStats(
  event: EventCandidate | null | undefined,
): FeedCaptureStats {
  const fragments = readFeedCaptureFragments(event);
  const embedded = event?.metadata?.[FEED_CAPTURE_STATS_META_KEY];
  if (embedded && typeof embedded === "object") {
    const stats = embedded as Partial<FeedCaptureStats>;
    return {
      photos: typeof stats.photos === "number" ? stats.photos : 0,
      videos: typeof stats.videos === "number" ? stats.videos : 0,
      links: typeof stats.links === "number" ? stats.links : 0,
      memos: typeof stats.memos === "number" ? stats.memos : 0,
    };
  }

  return fragments.reduce<FeedCaptureStats>(
    (acc, fragment) => {
      if (fragment.kind === "photo") {
        acc.photos += 1;
      } else if (fragment.kind === "video") {
        acc.videos += 1;
      } else if (fragment.kind === "link") {
        acc.links += 1;
      } else {
        acc.memos += 1;
      }
      return acc;
    },
    { photos: 0, videos: 0, links: 0, memos: 0 },
  );
}

export function appendFeedCaptureFragment(
  metadata: Record<string, unknown> | undefined,
  fragment: FeedCaptureFragment,
): Record<string, unknown> {
  const next = { ...(metadata ?? {}) };
  const existing = readFeedCaptureFragments({ metadata: next } as EventCandidate);
  next[FEED_CAPTURES_META_KEY] = [...existing, fragment];

  const stats = readFeedCaptureStats({ metadata: next } as EventCandidate);
  next[FEED_CAPTURE_STATS_META_KEY] = stats;
  return next;
}

export function removeFeedCaptureFragment(
  metadata: Record<string, unknown> | undefined,
  fragmentId: string,
): Record<string, unknown> {
  const next = { ...(metadata ?? {}) };
  const existing = readFeedCaptureFragments({ metadata: next } as EventCandidate).filter(
    (fragment) =>
      fragment.id !== fragmentId &&
      fragment.mediaContextId?.trim() !== fragmentId,
  );
  next[FEED_CAPTURES_META_KEY] = existing;
  next[FEED_CAPTURE_STATS_META_KEY] = readFeedCaptureStats({
    metadata: next,
  } as EventCandidate);
  return next;
}

export function formatFeedCaptureSummaryLine(
  event: EventCandidate | null | undefined,
): string | null {
  const stats = readFeedCaptureStats(event);
  const parts: string[] = [];
  if (stats.photos > 0) {
    parts.push(`📷 ${stats.photos}`);
  }
  if (stats.videos > 0) {
    parts.push(`영상 ${stats.videos}`);
  }
  if (stats.links > 0) {
    parts.push(`링크 ${stats.links}`);
  }
  if (stats.memos > 0) {
    parts.push(`메모 ${stats.memos}`);
  }
  if (parts.length === 0) {
    return null;
  }
  const place = event?.place?.trim();
  return place ? `${parts.join(" · ")} · ${place}` : parts.join(" · ");
}
