"use client";

import { prepareCaptureImageForUpload } from "@/lib/capture/prepare-capture-image";
import type {
  BulkMediaClusterEnrichmentResult,
  BulkMediaSpacetimeCluster,
  BulkMediaSpacetimePeek,
} from "@/lib/feed/bulk-media-spacetime-types";
import { summarizeBulkMediaClustersForWire } from "@/lib/feed/cluster-bulk-media-spacetime";
import { fetchWithTimeout } from "@/lib/http/fetch-with-timeout";

const BULK_CLUSTER_TIMEOUT_MS = 25_000;

export async function fetchBulkMediaClusterEnrichment(input: {
  clusters: readonly BulkMediaSpacetimeCluster[];
  peeks: readonly BulkMediaSpacetimePeek[];
  files: readonly File[];
}): Promise<BulkMediaClusterEnrichmentResult | null> {
  if (input.clusters.length === 0) {
    return null;
  }

  const wireSummaries = summarizeBulkMediaClustersForWire({
    clusters: input.clusters,
    peeks: input.peeks,
  });

  const form = new FormData();
  form.append("clusters", JSON.stringify(wireSummaries));

  let samplesAttached = 0;
  for (const cluster of input.clusters) {
    if (samplesAttached >= 3) {
      break;
    }
    const gpsLessPhotoIndex = cluster.indices.find((index) => {
      const peek = input.peeks[index];
      return peek && !peek.hasGps && peek.mediaKind === "photo";
    });
    if (gpsLessPhotoIndex === undefined) {
      continue;
    }
    const file = input.files[gpsLessPhotoIndex];
    if (!file?.type.startsWith("image/")) {
      continue;
    }
    try {
      const prepared = await prepareCaptureImageForUpload(file);
      form.append(`sample_${cluster.id}`, prepared);
      samplesAttached += 1;
    } catch {
      // Skip unreadable sample — text-only enrichment still runs.
    }
  }

  try {
    const response = await fetchWithTimeout("/api/globe/bulk-media-clusters", {
      method: "POST",
      body: form,
      timeoutMs: BULK_CLUSTER_TIMEOUT_MS,
      timeoutLabel: "bulk-media-clusters",
    });
    const payload = (await response.json()) as BulkMediaClusterEnrichmentResult & {
      error?: string;
    };
    if (!response.ok || !Array.isArray(payload.clusters)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
