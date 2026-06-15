import {
  hydrateMediaContextStore,
  readMediaContextMemorySnapshot,
} from "@/lib/location-ping/media-context-store";
import type { MediaSpacetimeContext } from "@/lib/location-ping/types";

export type MediaPoolItem = MediaSpacetimeContext & {
  poolStatus: "staged";
};

function isStagedPoolItem(row: MediaSpacetimeContext): row is MediaPoolItem {
  return row.poolStatus === "staged";
}

export async function listMediaPoolItems(): Promise<MediaPoolItem[]> {
  await hydrateMediaContextStore();
  const nowMs = Date.now();
  return readMediaContextMemorySnapshot()
    .filter(isStagedPoolItem)
    .filter((row) => {
      const expiresMs = row.expiresAtIso ? Date.parse(row.expiresAtIso) : Number.NaN;
      return Number.isNaN(expiresMs) || expiresMs > nowMs;
    })
    .sort(
      (left, right) =>
        Date.parse(right.capturedAtIso) - Date.parse(left.capturedAtIso),
    );
}

export async function countMediaPoolItems(): Promise<number> {
  const rows = await listMediaPoolItems();
  return rows.length;
}

export async function findMediaPoolItem(
  contextId: string,
): Promise<MediaPoolItem | null> {
  const id = contextId.trim();
  if (!id) {
    return null;
  }
  const rows = await listMediaPoolItems();
  return rows.find((row) => row.id === id) ?? null;
}
