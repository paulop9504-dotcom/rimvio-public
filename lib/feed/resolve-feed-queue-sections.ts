import type { RankedSurface, SurfaceLifecycle } from "@/lib/surface-engine/surface-contract";
import type { SurfaceNode } from "@/lib/surface-composition/surface-node-contract";
import { isFallbackSurface } from "@/lib/surface-engine/surface-ux-state";

export type FeedQueueSectionId = "in_progress" | "context_actions" | "up_next";

export type FeedQueueSection = {
  id: FeedQueueSectionId;
  rows: readonly RankedSurface[];
};

const IN_PROGRESS_LIFECYCLES = new Set<SurfaceLifecycle>([
  "in_progress",
  "preparing",
  "active",
]);

const FEED_QUEUE_MAX_ROWS = 8;

export function isFeedQueueInProgress(surface: RankedSurface): boolean {
  return IN_PROGRESS_LIFECYCLES.has(surface.lifecycle);
}

export function buildFeedContextActionRows(primary: SurfaceNode | null): RankedSurface[] {
  if (!primary) {
    return [];
  }
  return primary.secondaryActions.slice(3).map((action) => ({
    ...primary,
    id: `${primary.id}:sec:${action.id}`,
    title: action.label,
    description: primary.title,
    primaryAction: { ...action, kind: "primary" as const },
    secondaryActions: [],
  }));
}

/** Pure projection — primary folds into queue (no feed hero). */
export function resolveFeedQueueSections(
  primary: SurfaceNode | null,
  latent: readonly RankedSurface[],
): FeedQueueSection[] {
  const inProgress: RankedSurface[] = [];
  const upNext: RankedSurface[] = [];

  for (const row of latent) {
    if (isFeedQueueInProgress(row)) {
      inProgress.push(row);
    } else {
      upNext.push(row);
    }
  }

  const queuePrimary =
    primary && !isFallbackSurface(primary) ? (primary as RankedSurface) : null;
  if (queuePrimary) {
    if (isFeedQueueInProgress(queuePrimary)) {
      inProgress.unshift(queuePrimary);
    } else {
      upNext.unshift(queuePrimary);
    }
  }

  const contextActions = buildFeedContextActionRows(primary);
  const sections: FeedQueueSection[] = [];

  if (inProgress.length > 0) {
    sections.push({ id: "in_progress", rows: inProgress });
  }
  if (contextActions.length > 0) {
    sections.push({ id: "context_actions", rows: contextActions });
  }
  if (upNext.length > 0) {
    sections.push({ id: "up_next", rows: upNext });
  }

  return sections;
}

export function flattenFeedQueueSections(sections: readonly FeedQueueSection[]): RankedSurface[] {
  const rows: RankedSurface[] = [];
  for (const section of sections) {
    for (const row of section.rows) {
      rows.push(row);
      if (rows.length >= FEED_QUEUE_MAX_ROWS) {
        return rows;
      }
    }
  }
  return rows;
}

export function countFeedQueueRows(sections: readonly FeedQueueSection[]): number {
  let count = 0;
  for (const section of sections) {
    count += section.rows.length;
  }
  return count;
}

export function filterFeedQueueSections(
  sections: readonly FeedQueueSection[],
  predicate: (row: RankedSurface) => boolean,
): FeedQueueSection[] {
  return sections
    .map((section) => ({
      ...section,
      rows: section.rows.filter(predicate),
    }))
    .filter((section) => section.rows.length > 0);
}
