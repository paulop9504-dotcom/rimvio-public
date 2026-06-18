"use client";

import { deleteMediaBlob } from "@/lib/location-ping/media-blob-store";
import {
  deleteMediaSpacetimeContext,
  hydrateMediaContextStore,
  readMediaContextMemorySnapshot,
} from "@/lib/location-ping/media-context-store";

export type MediaPoolPruneSummary = {
  pruned: number;
  ids: string[];
};

/** Drop staged pool blobs past expiresAtIso (~7 days). */
export async function pruneExpiredMediaPool(
  nowMs = Date.now(),
): Promise<MediaPoolPruneSummary> {
  await hydrateMediaContextStore();
  const ids: string[] = [];

  for (const row of readMediaContextMemorySnapshot()) {
    if (row.poolStatus !== "staged") {
      continue;
    }
    const expiresMs = row.expiresAtIso ? Date.parse(row.expiresAtIso) : Number.NaN;
    if (Number.isNaN(expiresMs) || expiresMs > nowMs) {
      continue;
    }
    await deleteMediaBlob(row.id);
    await deleteMediaSpacetimeContext(row.id);
    ids.push(row.id);
  }

  return { pruned: ids.length, ids };
}
