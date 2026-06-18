import type {
  BulkMediaClusterEnrichmentItem,
  BulkMediaClusterEnrichmentResult,
  BulkMediaClusterWireSummary,
  BulkMediaSpacetimeCluster,
  BulkMediaSpacetimePeek,
} from "@/lib/feed/bulk-media-spacetime-types";
import { parseIsoMs, scoreSpacetimeFit } from "@/lib/feed/spacetime-fit";

/** Batch grouping — slightly looser than single-file attach gate. */
export const BULK_CLUSTER_ATTACH_MIN_SCORE = 0.55;
export const BULK_CLUSTER_AMBIGUOUS_MAX_SCORE = 0.72;
const LONG_CLUSTER_SPAN_MS = 12 * 60 * 60 * 1000;

function fitPeekToAnchor(
  peek: BulkMediaSpacetimePeek,
  anchor: BulkMediaSpacetimePeek,
): ReturnType<typeof scoreSpacetimeFit> {
  return scoreSpacetimeFit({
    capturedAtIso: peek.capturedAtIso,
    lat: peek.lat,
    lng: peek.lng,
    eventStartIso: anchor.capturedAtIso,
    eventEndIso: anchor.capturedAtIso,
    eventPlace: anchor.placeLabel,
    eventLat: anchor.lat,
    eventLng: anchor.lng,
    capturedPlaceLabel: peek.placeLabel,
  });
}

function clusterSpanMs(cluster: BulkMediaSpacetimeCluster, peeks: readonly BulkMediaSpacetimePeek[]): number {
  const times = cluster.indices
    .map((index) => parseIsoMs(peeks[index]?.capturedAtIso))
    .filter((ms): ms is number => ms !== null);
  if (times.length < 2) {
    return 0;
  }
  return Math.max(...times) - Math.min(...times);
}

function detectAmbiguity(input: {
  cluster: BulkMediaSpacetimeCluster;
  peeks: readonly BulkMediaSpacetimePeek[];
  borderlineFit: boolean;
}): { ambiguous: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (input.borderlineFit) {
    reasons.push("borderline_spacetime");
  }

  const members = input.cluster.indices.map((index) => input.peeks[index]!);
  const gpsCount = members.filter((row) => row.hasGps).length;
  if (gpsCount > 0 && gpsCount < members.length) {
    reasons.push("mixed_gps");
  }
  if (clusterSpanMs(input.cluster, input.peeks) > LONG_CLUSTER_SPAN_MS) {
    reasons.push("long_time_span");
  }

  const places = new Set(
    members.map((row) => row.placeLabel?.trim()).filter((label): label is string => Boolean(label)),
  );
  if (places.size > 1) {
    reasons.push("conflicting_places");
  }

  return { ambiguous: reasons.length > 0, reasons };
}

/** Greedy time-ordered clusters from pre-sorted peeks. Pure — no LLM. */
export function clusterBulkMediaSpacetime(
  peeks: readonly BulkMediaSpacetimePeek[],
): BulkMediaSpacetimeCluster[] {
  if (peeks.length === 0) {
    return [];
  }

  const clusters: BulkMediaSpacetimeCluster[] = [];
  let clusterIndex = 0;

  for (let arrayIndex = 0; arrayIndex < peeks.length; arrayIndex += 1) {
    const peek = peeks[arrayIndex]!;
    const current = clusters[clusters.length - 1];
    if (!current) {
      clusters.push({
        id: `c${clusterIndex}`,
        indices: [arrayIndex],
        anchor: peek,
        ambiguous: false,
        ambiguousReasons: [],
      });
      clusterIndex += 1;
      continue;
    }

    const fit = fitPeekToAnchor(peek, current.anchor);
    if (fit.score < BULK_CLUSTER_ATTACH_MIN_SCORE) {
      clusters.push({
        id: `c${clusterIndex}`,
        indices: [arrayIndex],
        anchor: peek,
        ambiguous: false,
        ambiguousReasons: [],
      });
      clusterIndex += 1;
      continue;
    }

    current.indices.push(arrayIndex);
    const borderlineFit =
      fit.score >= BULK_CLUSTER_ATTACH_MIN_SCORE &&
      fit.score < BULK_CLUSTER_AMBIGUOUS_MAX_SCORE;
    const ambiguity = detectAmbiguity({
      cluster: current,
      peeks,
      borderlineFit,
    });
    current.ambiguous = ambiguity.ambiguous;
    current.ambiguousReasons = ambiguity.reasons;
  }

  return clusters;
}

export function summarizeBulkMediaClustersForWire(input: {
  clusters: readonly BulkMediaSpacetimeCluster[];
  peeks: readonly BulkMediaSpacetimePeek[];
}): BulkMediaClusterWireSummary[] {
  return input.clusters.map((cluster) => {
    const members = cluster.indices.map((index) => input.peeks[index]!);
    const times = members
      .map((row) => parseIsoMs(row.capturedAtIso))
      .filter((ms): ms is number => ms !== null);
    const startIso =
      times.length > 0
        ? new Date(Math.min(...times)).toISOString()
        : cluster.anchor.capturedAtIso;
    const endIso =
      times.length > 0
        ? new Date(Math.max(...times)).toISOString()
        : cluster.anchor.capturedAtIso;
    const placeLabels = members
      .map((row) => row.placeLabel?.trim())
      .filter((label): label is string => Boolean(label));
    const placeLabel = placeLabels[0] ?? cluster.anchor.placeLabel;

    return {
      id: cluster.id,
      fileCount: cluster.indices.length,
      startIso,
      endIso,
      placeLabel,
      hasGps: members.some((row) => row.hasGps),
      gpsLessCount: members.filter((row) => !row.hasGps).length,
      ambiguous: cluster.ambiguous,
      ambiguousReasons: cluster.ambiguousReasons,
    };
  });
}

export function applyBulkMediaClusterEnrichment(input: {
  clusters: readonly BulkMediaSpacetimeCluster[];
  enrichment: BulkMediaClusterEnrichmentResult;
}): BulkMediaSpacetimeCluster[] {
  const enrichById = new Map<string, BulkMediaClusterEnrichmentItem>(
    input.enrichment.clusters.map((row) => [row.id, row]),
  );

  let merged = input.clusters.map((cluster) => {
    const enrich = enrichById.get(cluster.id);
    if (!enrich) {
      return { ...cluster };
    }
    const placeLabel = enrich.placeLabel?.trim() || cluster.placeLabel || cluster.anchor.placeLabel;
    const title = enrich.title?.trim() || cluster.title || null;
    const bypassPool = Boolean(placeLabel && enrich.confidence !== "low");
    return {
      ...cluster,
      title,
      placeLabel,
      bypassPool,
      llmConfidence: enrich.confidence,
    };
  });

  for (const enrich of input.enrichment.clusters) {
    const mergeIntoId = enrich.mergeIntoId?.trim();
    if (!mergeIntoId || mergeIntoId === enrich.id) {
      continue;
    }
    const source = merged.find((row) => row.id === enrich.id);
    const target = merged.find((row) => row.id === mergeIntoId);
    if (!source || !target) {
      continue;
    }
    target.indices = [...new Set([...target.indices, ...source.indices])].sort(
      (left, right) => left - right,
    );
    target.ambiguous = target.ambiguous || source.ambiguous;
    target.ambiguousReasons = [
      ...new Set([...target.ambiguousReasons, ...source.ambiguousReasons, "llm_merge"]),
    ];
    if (!target.title?.trim() && source.title?.trim()) {
      target.title = source.title;
    }
    if (!target.placeLabel?.trim() && source.placeLabel?.trim()) {
      target.placeLabel = source.placeLabel;
    }
    target.bypassPool = target.bypassPool || source.bypassPool;
    merged = merged.filter((row) => row.id !== source.id);
  }

  return merged;
}
