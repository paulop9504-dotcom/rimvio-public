import assert from "node:assert/strict";
import {
  applyBulkMediaClusterEnrichment,
  BULK_CLUSTER_ATTACH_MIN_SCORE,
  BULK_CLUSTER_AMBIGUOUS_MAX_SCORE,
  clusterBulkMediaSpacetime,
  summarizeBulkMediaClustersForWire,
} from "@/lib/feed/cluster-bulk-media-spacetime";
import type { BulkMediaSpacetimePeek } from "@/lib/feed/bulk-media-spacetime-types";
import { fallbackBulkMediaClusterEnrichment } from "@/lib/globe/llm/bulk-media-cluster-enrichment";

function peek(input: {
  index: number;
  capturedAtIso: string;
  lat: number | null;
  lng: number | null;
  placeLabel?: string | null;
  resolveSource?: BulkMediaSpacetimePeek["resolveSource"];
  mediaKind?: BulkMediaSpacetimePeek["mediaKind"];
}): BulkMediaSpacetimePeek {
  const hasGps =
    input.lat !== null &&
    input.lng !== null &&
    Number.isFinite(input.lat) &&
    Number.isFinite(input.lng);
  return {
    index: input.index,
    capturedAtIso: input.capturedAtIso,
    lat: input.lat,
    lng: input.lng,
    placeLabel: input.placeLabel ?? null,
    resolveSource: input.resolveSource ?? "exif_gps",
    mediaKind: input.mediaKind ?? "photo",
    hasGps,
  };
}

function run() {
  const jejuMorning = peek({
    index: 0,
    capturedAtIso: "2025-08-10T09:00:00.000Z",
    lat: 33.4996,
    lng: 126.5312,
    placeLabel: "제주",
  });
  const jejuAfternoon = peek({
    index: 1,
    capturedAtIso: "2025-08-10T15:00:00.000Z",
    lat: 33.5101,
    lng: 126.5215,
    placeLabel: "제주",
  });
  const seoulDay = peek({
    index: 2,
    capturedAtIso: "2025-08-20T12:00:00.000Z",
    lat: 37.5665,
    lng: 126.978,
    placeLabel: "서울",
  });
  const gpsLess = peek({
    index: 3,
    capturedAtIso: "2025-08-10T14:00:00.000Z",
    lat: null,
    lng: null,
    placeLabel: null,
    resolveSource: "exif_datetime",
  });

  const sameTrip = clusterBulkMediaSpacetime([jejuMorning, jejuAfternoon, gpsLess]);
  assert.equal(sameTrip.length, 1);
  assert.equal(sameTrip[0]!.indices.length, 3);
  assert.ok(sameTrip[0]!.ambiguous);

  const splitTrips = clusterBulkMediaSpacetime([jejuMorning, seoulDay]);
  assert.equal(splitTrips.length, 2);

  const wire = summarizeBulkMediaClustersForWire({
    clusters: sameTrip,
    peeks: [jejuMorning, jejuAfternoon, gpsLess],
  });
  assert.equal(wire[0]!.fileCount, 3);
  assert.equal(wire[0]!.gpsLessCount, 1);

  const enriched = applyBulkMediaClusterEnrichment({
    clusters: sameTrip,
    enrichment: {
      clusters: [
        {
          id: "c0",
          title: "작년 여름 제주",
          placeLabel: "제주",
          mergeIntoId: null,
          confidence: "high",
        },
      ],
    },
  });
  assert.equal(enriched[0]!.title, "작년 여름 제주");
  assert.equal(enriched[0]!.bypassPool, true);

  const mergePair = clusterBulkMediaSpacetime([
    jejuMorning,
    peek({
      index: 1,
      capturedAtIso: "2025-08-10T11:00:00.000Z",
      lat: 33.505,
      lng: 126.525,
      placeLabel: "제주",
    }),
    seoulDay,
  ]);
  assert.equal(mergePair.length, 2);

  const merged = applyBulkMediaClusterEnrichment({
    clusters: mergePair,
    enrichment: {
      clusters: [
        { id: "c1", title: null, placeLabel: null, mergeIntoId: "c0", confidence: "medium" },
        { id: "c0", title: "제주 나들이", placeLabel: "제주", mergeIntoId: null, confidence: "high" },
      ],
    },
  });
  assert.equal(merged.length, 1);
  assert.equal(merged[0]!.indices.length, 3);

  const fallback = fallbackBulkMediaClusterEnrichment({
    clusters: wire,
  });
  assert.ok(fallback.fallback);
  assert.equal(fallback.clusters[0]!.title, "제주 흔적");

  assert.ok(BULK_CLUSTER_ATTACH_MIN_SCORE < BULK_CLUSTER_AMBIGUOUS_MAX_SCORE);
  console.log("test-bulk-media-cluster: ok");
}

run();
