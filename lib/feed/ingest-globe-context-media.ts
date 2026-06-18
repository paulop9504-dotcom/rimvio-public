"use client";

import {
  applyBulkMediaClusterEnrichment,
  clusterBulkMediaSpacetime,
} from "@/lib/feed/cluster-bulk-media-spacetime";
import type { BulkMediaSpacetimeCluster } from "@/lib/feed/bulk-media-spacetime-types";
import { peekBulkMediaSpacetime } from "@/lib/feed/peek-bulk-media-spacetime";
import { fetchBulkMediaClusterEnrichment } from "@/lib/globe/fetch-bulk-media-cluster-enrichment";
import { findEventCandidate, upsertEventCandidate } from "@/lib/events/event-store";
import { copy } from "@/lib/copy/human-ko";
import type { EventCandidate } from "@/lib/events/event-candidate";
import type { FeedCaptureFragment, SpacetimeFeedTargetMatch } from "@/lib/feed/feed-capture-types";
import {
  commitCaptureToEvent,
  type SearchCaptureIngestResult,
} from "@/lib/feed/ingest-search-capture";
import { resolveTargetEventFromSpacetime } from "@/lib/feed/resolve-target-event-from-spacetime";
import { CONTEXT_MATCH_MIN_SCORE } from "@/lib/ingest/context-match-media-gate";
import { scoreSpacetimeFit } from "@/lib/feed/spacetime-fit";
import { recoverGlobeContextEventFromPin } from "@/lib/globe/recover-globe-context-event";
import { enrichGlobePhotoPlaceAfterIngest } from "@/lib/globe/enrich-globe-photo-place-after-ingest";
import {
  buildExifAutoPinMetadata,
  mergeExifAutoPinOntoEvent,
} from "@/lib/globe/exif-auto-pin-metadata";
import { createPersonalGlobePinFromEvent } from "@/lib/globe/create-personal-globe-pin";
import { publishBridgeCaptureContribution } from "@/lib/experience-bridge/publish-bridge-capture-contribution";
import { syncPersonalGlobePinFromEvent } from "@/lib/globe/sync-personal-globe-pin";
import { attachMediaSpacetime } from "@/lib/location-ping/attach-media-spacetime";
import { patchMediaSpacetimeOriginRef, saveMediaSpacetimeContext } from "@/lib/location-ping/media-context-store";
import type { MediaSpacetimeContext } from "@/lib/location-ping/types";
import { readPlanContextFromEvent } from "@/lib/plan-context/plan-context-metadata";
import { sortMediaFilesByCaptureTime } from "@/lib/feed/sort-media-files-by-capture-time";
import { shouldStageMediaToPool } from "@/lib/media-pool/is-media-pool-candidate";
import {
  MEDIA_POOL_ORIGIN_REF,
  MEDIA_POOL_RETENTION_MS,
} from "@/lib/media-pool/media-pool-constants";

export const GLOBE_CONTEXT_MEDIA_ACCEPT = "image/*,video/*";

const VIDEO_EXT =
  /\.(mp4|mov|m4v|webm|mkv|avi|3gp|3g2|qt|mpeg|mpg)$/iu;

export function isGlobeContextIngestMediaFile(file: File): boolean {
  const type = file.type.trim().toLowerCase();
  if (type.startsWith("image/") || type.startsWith("video/")) {
    return true;
  }
  if (!type) {
    const name = file.name.trim().toLowerCase();
    return (
      /\.(jpe?g|png|gif|webp|heic|heif|bmp|avif)$/iu.test(name) ||
      VIDEO_EXT.test(name)
    );
  }
  return false;
}

function mediaNoun(kind: FeedCaptureFragment["kind"]): string {
  return kind === "video" ? "동영상" : "사진";
}

export type GlobeContextMediaIngestResult = {
  result: SearchCaptureIngestResult;
  attachedToHintedEvent: boolean;
  separated: boolean;
  toastLine: string;
  suggestedPlaceName: string | null;
  exifAutoPinned: boolean;
  pinCreated: boolean;
  stagedToPool?: boolean;
};

export type GlobeBulkMediaIngestSummary = {
  total: number;
  succeeded: number;
  failed: number;
  attached: number;
  separated: number;
  pinsCreated: number;
  exifPinned: number;
  poolStaged: number;
  lastEventId: string | null;
  toastLine: string;
  lastSuggestedPlaceName: string | null;
};

function captureKindFromContext(context: MediaSpacetimeContext): FeedCaptureFragment["kind"] {
  if (context.mediaKind === "video") {
    return "video";
  }
  return "photo";
}

function buildMatch(
  event: EventCandidate,
  score: number,
  placeLabel: string | null,
): SpacetimeFeedTargetMatch {
  return {
    eventId: event.id,
    eventTitle: event.title,
    confidence: score >= 0.82 ? "high" : score >= CONTEXT_MATCH_MIN_SCORE ? "medium" : "low",
    score,
    placeLabel,
    dayLabel: null,
    reason: event.title,
  };
}

function readEventPlaceAnchor(
  event: EventCandidate,
): { lat: number; lng: number } | null {
  const meta = event.metadata ?? {};
  const lat = typeof meta.globePlaceLat === "number" ? meta.globePlaceLat : null;
  const lng = typeof meta.globePlaceLng === "number" ? meta.globePlaceLng : null;
  if (lat !== null && lng !== null && Number.isFinite(lat) && Number.isFinite(lng)) {
    return { lat, lng };
  }
  return null;
}

function resolveHintedEvent(hintId: string): EventCandidate | null {
  const trimmed = hintId.trim();
  if (!trimmed) {
    return null;
  }
  return (
    findEventCandidate(trimmed) ?? recoverGlobeContextEventFromPin(trimmed)
  );
}

function resolveGlobePhotoTarget(input: {
  context: MediaSpacetimeContext;
  hintEventId?: string | null;
  forceAttachToHint?: boolean;
}): {
  event: EventCandidate;
  match: SpacetimeFeedTargetMatch | null;
  createdNewEvent: boolean;
  attachedToHintedEvent: boolean;
  separated: boolean;
} {
  const events = listEventCandidates();
  const hintId = input.hintEventId?.trim();

  if (hintId && input.forceAttachToHint) {
    const hinted = resolveHintedEvent(hintId);
    if (hinted) {
      const plan = readPlanContextFromEvent(hinted);
      const anchor = readEventPlaceAnchor(hinted);
      const fit = scoreSpacetimeFit({
        capturedAtIso: input.context.capturedAtIso,
        lat: input.context.lat,
        lng: input.context.lng,
        eventStartIso: hinted.datetime!,
        eventEndIso: plan?.windowEndIso ?? null,
        eventPlace: plan?.place ?? hinted.place,
        eventLat: anchor?.lat ?? null,
        eventLng: anchor?.lng ?? null,
        capturedPlaceLabel: input.context.placeLabel,
      });
      return {
        event: hinted,
        match: buildMatch(
          hinted,
          Math.max(fit.score, CONTEXT_MATCH_MIN_SCORE),
          plan?.place ?? hinted.place ?? input.context.placeLabel,
        ),
        createdNewEvent: false,
        attachedToHintedEvent: true,
        separated: false,
      };
    }
  }

  if (hintId) {
    const hinted = resolveHintedEvent(hintId);
    if (hinted) {
      const plan = readPlanContextFromEvent(hinted);
      const anchor = readEventPlaceAnchor(hinted);
      const fit = scoreSpacetimeFit({
        capturedAtIso: input.context.capturedAtIso,
        lat: input.context.lat,
        lng: input.context.lng,
        eventStartIso: hinted.datetime!,
        eventEndIso: plan?.windowEndIso ?? null,
        eventPlace: plan?.place ?? hinted.place,
        eventLat: anchor?.lat ?? null,
        eventLng: anchor?.lng ?? null,
        capturedPlaceLabel: input.context.placeLabel,
      });

      if (fit.score >= CONTEXT_MATCH_MIN_SCORE || fit.fits) {
        return {
          event: hinted,
          match: buildMatch(
            hinted,
            Math.max(fit.score, CONTEXT_MATCH_MIN_SCORE),
            plan?.place ?? hinted.place ?? input.context.placeLabel,
          ),
          createdNewEvent: false,
          attachedToHintedEvent: true,
          separated: false,
        };
      }

      const resolved = resolveTargetEventFromSpacetime({
        capturedAtIso: input.context.capturedAtIso,
        lat: input.context.lat,
        lng: input.context.lng,
        placeLabel: input.context.placeLabel,
        events,
      });

      return {
        event: resolved.event,
        match: resolved.match,
        createdNewEvent: resolved.createdNewEvent,
        attachedToHintedEvent: false,
        separated: true,
      };
    }
  }

  const resolved = resolveTargetEventFromSpacetime({
    capturedAtIso: input.context.capturedAtIso,
    lat: input.context.lat,
    lng: input.context.lng,
    placeLabel: input.context.placeLabel,
    events,
  });

  return {
    event: resolved.event,
    match: resolved.match,
    createdNewEvent: resolved.createdNewEvent,
    attachedToHintedEvent: false,
    separated: resolved.createdNewEvent || resolved.event.id !== hintId,
  };
}

function buildGlobeToast(input: {
  result: SearchCaptureIngestResult;
  attachedToHintedEvent: boolean;
  separated: boolean;
  hintTitle?: string | null;
}): string {
  if (input.attachedToHintedEvent) {
    return `${input.result.event.title} 맥락에 ${mediaNoun(input.result.fragment.kind)} 붙였어요`;
  }
  if (input.separated) {
    const hint = input.hintTitle?.trim();
    if (hint) {
      return `${hint}와는 따로 · ${input.result.event.title}에 넣었어요`;
    }
    return input.result.toastLine;
  }
  return input.result.toastLine;
}

export type BulkClusterIngestHint = {
  title?: string | null;
  placeLabel?: string | null;
  bypassPool?: boolean;
};

function applyBulkClusterPlaceToContext(
  context: MediaSpacetimeContext,
  hint?: BulkClusterIngestHint | null,
): MediaSpacetimeContext {
  const placeLabel = hint?.placeLabel?.trim();
  if (!placeLabel) {
    return context;
  }
  return {
    ...context,
    placeLabel,
  };
}

function patchEventWithBulkClusterTitle(input: {
  eventId: string;
  title?: string | null;
}): void {
  const title = input.title?.trim();
  if (!title) {
    return;
  }
  const existing = findEventCandidate(input.eventId);
  if (!existing) {
    return;
  }
  upsertEventCandidate({
    id: existing.id,
    title,
    category: existing.category,
    source: existing.source,
    lifecycle: existing.lifecycle,
    datetime: existing.datetime,
    place: existing.place ?? undefined,
    confidence: existing.confidence,
    metadata: {
      ...existing.metadata,
      bulkClusterLlmTitle: true,
    },
  });
  syncPersonalGlobePinFromEvent(existing.id);
}

/** Globe / pin-open photo — attach when spacetime fits, else split to new moment. */
export async function ingestGlobeContextMedia(input: {
  file: File;
  hintEventId?: string | null;
  hintTitle?: string | null;
  /** Pin card upload — always attach to hinted context (user intent). */
  forceAttachToHint?: boolean;
  bulkClusterHint?: BulkClusterIngestHint | null;
  onFilePrepare?: (message: string) => void;
}): Promise<GlobeContextMediaIngestResult> {
  const rawContext = await attachMediaSpacetime({
    file: input.file,
    origin: "feed_capture",
    originRef: input.hintEventId?.trim() || "globe",
    onFilePrepare: input.onFilePrepare,
  });
  const context = applyBulkClusterPlaceToContext(rawContext, input.bulkClusterHint);

  if (
    shouldStageMediaToPool({
      context,
      forceAttachToHint: input.forceAttachToHint === true,
      bulkClusterPlaceLabel: input.bulkClusterHint?.bypassPool
        ? input.bulkClusterHint.placeLabel
        : null,
    })
  ) {
    const staged: MediaSpacetimeContext = {
      ...context,
      poolStatus: "staged",
      expiresAtIso: new Date(Date.now() + MEDIA_POOL_RETENTION_MS).toISOString(),
      origin: "media_pool",
      originRef: MEDIA_POOL_ORIGIN_REF,
    };
    await saveMediaSpacetimeContext(staged);

    const noun = staged.mediaKind === "video" ? "동영상" : "사진";
    const toastLine = `${noun} 보관함에 넣었어요 · 맥락은 나중에 만들 수 있어요`;

    return {
      result: {
        event: {
          id: staged.id,
          title: "보관함",
          category: "travel",
          source: "system",
          lifecycle: "candidate",
          datetime: staged.capturedAtIso,
          place: staged.placeLabel ?? undefined,
          confidence: 1,
          lifecycleUpdatedAt: staged.attachedAtIso,
          createdAt: staged.attachedAtIso,
          updatedAt: staged.attachedAtIso,
          metadata: { mediaPoolStaged: true },
        },
        fragment: {
          id: staged.id,
          kind: captureKindFromContext(staged),
          capturedAtIso: staged.capturedAtIso,
          mediaContextId: staged.id,
          placeLabel: staged.placeLabel ?? undefined,
        },
        createdNewEvent: false,
        toastLine,
      },
      attachedToHintedEvent: false,
      separated: false,
      toastLine,
      suggestedPlaceName: null,
      exifAutoPinned: false,
      pinCreated: false,
      stagedToPool: true,
    };
  }

  const target = resolveGlobePhotoTarget({
    context,
    hintEventId: input.hintEventId,
    forceAttachToHint: input.forceAttachToHint === true,
  });

  const exifAutoPinned = buildExifAutoPinMetadata(context) !== null;
  const eventForCommit = mergeExifAutoPinOntoEvent(target.event, context);

  const fragment: FeedCaptureFragment = {
    id: context.id,
    kind: captureKindFromContext(context),
    capturedAtIso: context.capturedAtIso,
    mediaContextId: context.id,
    placeLabel: context.placeLabel ?? undefined,
  };

  const result = commitCaptureToEvent({
    target: eventForCommit,
    match: target.match,
    createdNewEvent: target.createdNewEvent,
    fragment,
    userConfirmedTarget: target.attachedToHintedEvent,
  });

  if (target.event.id.trim() && context.originRef?.trim() !== target.event.id.trim()) {
    await patchMediaSpacetimeOriginRef(context.id, result.event.id);
  }

  if (target.createdNewEvent && input.bulkClusterHint?.title?.trim()) {
    patchEventWithBulkClusterTitle({
      eventId: result.event.id,
      title: input.bulkClusterHint.title,
    });
  }

  const savedEvent =
    findEventCandidate(result.event.id) ??
    (input.bulkClusterHint?.title?.trim() && target.createdNewEvent
      ? { ...result.event, title: input.bulkClusterHint.title.trim() }
      : result.event);
  const pinResult = createPersonalGlobePinFromEvent({
    event: savedEvent,
  });
  syncPersonalGlobePinFromEvent(result.event.id);
  if (input.hintEventId?.trim() && input.hintEventId !== result.event.id) {
    syncPersonalGlobePinFromEvent(input.hintEventId);
  }

  void publishBridgeCaptureContribution({
    eventId: result.event.id,
    fragment: result.fragment,
  }).catch((caught) => {
    if (typeof window !== "undefined") {
      const message =
        caught instanceof Error ? caught.message : "공유 미디어를 올리지 못했어요.";
      void import("sonner").then(({ toast }) => toast.error(message));
    }
  });

  let suggestedPlaceName: string | null = null;
  try {
    suggestedPlaceName = await enrichGlobePhotoPlaceAfterIngest({
      file: input.file,
      context,
      eventId: result.event.id,
    });
  } catch {
    // Non-blocking — photo ingest should still succeed.
  }

  return {
    result,
    attachedToHintedEvent: target.attachedToHintedEvent,
    separated: target.separated,
    toastLine: buildGlobeToast({
      result,
      attachedToHintedEvent: target.attachedToHintedEvent,
      separated: target.separated,
      hintTitle: input.hintTitle,
    }),
    suggestedPlaceName,
    exifAutoPinned,
    pinCreated: pinResult.created,
  };
}

function buildBulkToast(input: {
  total: number;
  succeeded: number;
  failed: number;
  attached: number;
  separated: number;
  pinsCreated: number;
  exifPinned: number;
  poolStaged: number;
}): string {
  if (input.succeeded === 0) {
    return input.failed > 0
      ? "사진·동영상을 넣지 못했어요"
      : "올릴 사진·동영상이 없어요";
  }
  if (input.poolStaged > 0 && input.poolStaged === input.succeeded) {
    if (input.total === 1) {
      return "사진 보관함에 넣었어요 · 맥락은 나중에";
    }
    return `보관함 ${input.poolStaged}개 · 맥락은 나중에 만들 수 있어요`;
  }
  if (input.total === 1) {
    if (input.exifPinned > 0 && input.pinsCreated > 0) {
      return "사진 위치를 읽어 지도에 핀을 꽂았어요";
    }
    return input.failed > 0 ? "1개를 넣지 못했어요" : "사진·동영상 1개 붙였어요";
  }
  const parts: string[] = [];
  if (input.exifPinned > 0 && input.pinsCreated > 0) {
    parts.push(
      input.pinsCreated > 1
        ? `사진 ${input.succeeded}개 · 지도에 ${input.pinsCreated}곳 핀`
        : `사진 ${input.succeeded}개 · 지도에 핀 꽂았어요`,
    );
  } else if (input.poolStaged > 0) {
    parts.push(`보관함 ${input.poolStaged}개`);
  } else {
    parts.push(`사진·동영상 ${input.succeeded}개 붙였어요`);
  }
  if (input.attached > 0 && input.separated > 0) {
    parts.push(`${input.attached}개 맥락 · ${input.separated}개 따로`);
  } else if (input.separated > 0) {
    parts.push(`${input.separated}개는 맥락과 따로`);
  }
  if (input.failed > 0) {
    parts.push(`${input.failed}개 실패`);
  }
  return parts.join(" · ");
}

function recordBulkOutcome(input: {
  outcome: GlobeContextMediaIngestResult;
  outcomes: GlobeContextMediaIngestResult[];
  counters: {
    attached: number;
    separated: number;
    exifPinned: number;
    poolStaged: number;
    pinsCreated: number;
    pinEventsSeen: Set<string>;
    lastEventId: string | null;
  };
}): void {
  input.outcomes.push(input.outcome);
  if (input.outcome.stagedToPool) {
    input.counters.poolStaged += 1;
    return;
  }
  input.counters.lastEventId = input.outcome.result.event.id;
  if (input.outcome.attachedToHintedEvent) {
    input.counters.attached += 1;
  } else if (input.outcome.separated) {
    input.counters.separated += 1;
  }
  if (input.outcome.exifAutoPinned) {
    input.counters.exifPinned += 1;
  }
  if (
    input.outcome.pinCreated &&
    !input.counters.pinEventsSeen.has(input.outcome.result.event.id)
  ) {
    input.counters.pinEventsSeen.add(input.outcome.result.event.id);
    input.counters.pinsCreated += 1;
  }
}

function buildBulkClusterHint(cluster: BulkMediaSpacetimeCluster): BulkClusterIngestHint | null {
  if (!cluster.title?.trim() && !cluster.placeLabel?.trim()) {
    return null;
  }
  return {
    title: cluster.title ?? null,
    placeLabel: cluster.placeLabel ?? null,
    bypassPool: cluster.bypassPool === true,
  };
}

async function ingestGlobeContextMediaBulkClustered(input: {
  mediaFiles: File[];
  hintEventId?: string | null;
  hintTitle?: string | null;
  onProgress?: (done: number, total: number) => void;
  onFilePrepare?: (message: string) => void;
}): Promise<{
  outcomes: GlobeContextMediaIngestResult[];
  failed: number;
  attached: number;
  separated: number;
  pinsCreated: number;
  exifPinned: number;
  poolStaged: number;
  lastEventId: string | null;
}> {
  const total = input.mediaFiles.length;
  const outcomes: GlobeContextMediaIngestResult[] = [];
  let failed = 0;
  const counters = {
    attached: 0,
    separated: 0,
    exifPinned: 0,
    poolStaged: 0,
    pinsCreated: 0,
    pinEventsSeen: new Set<string>(),
    lastEventId: null as string | null,
  };

  input.onFilePrepare?.(copy.globe.bulkClusterPeekToast);
  const peeks = await peekBulkMediaSpacetime(input.mediaFiles);
  let clusters = clusterBulkMediaSpacetime(peeks);

  input.onFilePrepare?.(copy.globe.bulkClusterGroupToast);
  const enrichment = await fetchBulkMediaClusterEnrichment({
    clusters,
    peeks,
    files: input.mediaFiles,
  });
  if (enrichment) {
    clusters = applyBulkMediaClusterEnrichment({ clusters, enrichment });
  }

  let progress = 0;
  for (const cluster of clusters) {
    const clusterHint = buildBulkClusterHint(cluster);
    let clusterEventId: string | null = null;

    for (const fileIndex of cluster.indices) {
      try {
        const outcome = await ingestGlobeContextMedia({
          file: input.mediaFiles[fileIndex]!,
          hintEventId: clusterEventId ?? input.hintEventId,
          hintTitle: clusterHint?.title ?? input.hintTitle,
          forceAttachToHint: clusterEventId ? true : false,
          bulkClusterHint: clusterHint,
          onFilePrepare: input.onFilePrepare,
        });
        recordBulkOutcome({ outcome, outcomes, counters });
        if (!clusterEventId && !outcome.stagedToPool) {
          clusterEventId = outcome.result.event.id;
        }
      } catch {
        failed += 1;
      }
      progress += 1;
      input.onProgress?.(progress, total);
    }
  }

  return {
    outcomes,
    failed,
    attached: counters.attached,
    separated: counters.separated,
    pinsCreated: counters.pinsCreated,
    exifPinned: counters.exifPinned,
    poolStaged: counters.poolStaged,
    lastEventId: counters.lastEventId,
  };
}

/** Bulk photos/videos — cluster + LLM naming, then attach/split per spacetime. */
export async function ingestGlobeContextMediaBulk(input: {
  files: File[];
  hintEventId?: string | null;
  hintTitle?: string | null;
  forceAttachToHint?: boolean;
  onProgress?: (done: number, total: number) => void;
  onFilePrepare?: (message: string) => void;
}): Promise<
  GlobeBulkMediaIngestSummary & { outcomes: GlobeContextMediaIngestResult[] }
> {
  const mediaFiles = await sortMediaFilesByCaptureTime(
    input.files.filter(isGlobeContextIngestMediaFile),
  );
  const total = mediaFiles.length;

  if (total >= 2 && !input.forceAttachToHint && !input.hintEventId?.trim()) {
    const clustered = await ingestGlobeContextMediaBulkClustered({
      mediaFiles,
      hintEventId: input.hintEventId,
      hintTitle: input.hintTitle,
      onProgress: input.onProgress,
      onFilePrepare: input.onFilePrepare,
    });
    const succeeded = clustered.outcomes.length;
    const lastSuggestedPlaceName =
      [...clustered.outcomes]
        .reverse()
        .find((row) => row.suggestedPlaceName?.trim())
        ?.suggestedPlaceName?.trim() ?? null;
    return {
      total,
      succeeded,
      failed: clustered.failed,
      attached: clustered.attached,
      separated: clustered.separated,
      pinsCreated: clustered.pinsCreated,
      exifPinned: clustered.exifPinned,
      poolStaged: clustered.poolStaged,
      lastEventId: clustered.lastEventId,
      toastLine: buildBulkToast({
        total,
        succeeded,
        failed: clustered.failed,
        attached: clustered.attached,
        separated: clustered.separated,
        pinsCreated: clustered.pinsCreated,
        exifPinned: clustered.exifPinned,
        poolStaged: clustered.poolStaged,
      }),
      lastSuggestedPlaceName,
      outcomes: clustered.outcomes,
    };
  }

  const outcomes: GlobeContextMediaIngestResult[] = [];
  let failed = 0;
  let attached = 0;
  let separated = 0;
  let pinsCreated = 0;
  let exifPinned = 0;
  let poolStaged = 0;
  let lastEventId: string | null = null;
  const pinEventsSeen = new Set<string>();

  for (let index = 0; index < mediaFiles.length; index += 1) {
    try {
      const outcome = await ingestGlobeContextMedia({
        file: mediaFiles[index]!,
        hintEventId: input.hintEventId,
        hintTitle: input.hintTitle,
        forceAttachToHint: input.forceAttachToHint,
        onFilePrepare: input.onFilePrepare,
      });
      outcomes.push(outcome);
      if (outcome.stagedToPool) {
        poolStaged += 1;
      } else {
        lastEventId = outcome.result.event.id;
      }
      if (outcome.attachedToHintedEvent) {
        attached += 1;
      } else if (outcome.separated) {
        separated += 1;
      }
      if (outcome.exifAutoPinned) {
        exifPinned += 1;
      }
      if (outcome.pinCreated && !pinEventsSeen.has(outcome.result.event.id)) {
        pinEventsSeen.add(outcome.result.event.id);
        pinsCreated += 1;
      }
    } catch {
      failed += 1;
    }
    input.onProgress?.(index + 1, total);
  }

  const succeeded = outcomes.length;
  const lastSuggestedPlaceName =
    [...outcomes]
      .reverse()
      .find((row) => row.suggestedPlaceName?.trim())
      ?.suggestedPlaceName?.trim() ?? null;
  return {
    total,
    succeeded,
    failed,
    attached,
    separated,
    pinsCreated,
    exifPinned,
    poolStaged,
    lastEventId,
    toastLine: buildBulkToast({
      total,
      succeeded,
      failed,
      attached,
      separated,
      pinsCreated,
      exifPinned,
      poolStaged,
    }),
    lastSuggestedPlaceName,
    outcomes,
  };
}
