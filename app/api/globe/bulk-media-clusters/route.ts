import { NextResponse, type NextRequest } from "next/server";
import type { BulkMediaClusterWireSummary } from "@/lib/feed/bulk-media-spacetime-types";
import {
  enrichBulkMediaClusters,
  fallbackBulkMediaClusterEnrichment,
} from "@/lib/globe/llm/bulk-media-cluster-enrichment";
import { logApi } from "@/lib/server/logger";
import { readRequestId } from "@/lib/server/request-context";

export const maxDuration = 60;
export const runtime = "nodejs";

const MAX_SAMPLE_BYTES = 8 * 1024 * 1024;

function parseClustersField(raw: FormDataEntryValue | null): BulkMediaClusterWireSummary[] {
  if (typeof raw !== "string" || !raw.trim()) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as BulkMediaClusterWireSummary[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function POST(request: NextRequest) {
  const requestId = readRequestId(request);
  const started = Date.now();

  try {
    const formData = await request.formData();
    const clusters = parseClustersField(formData.get("clusters"));

    if (clusters.length === 0) {
      return NextResponse.json({ error: "clusters_required" }, { status: 400 });
    }

    const samples = new Map<string, { buffer: Buffer; mimeType: string }>();
    for (const cluster of clusters) {
      const sample = formData.get(`sample_${cluster.id}`);
      if (!(sample instanceof File) || !sample.type.startsWith("image/")) {
        continue;
      }
      const buffer = Buffer.from(await sample.arrayBuffer());
      if (buffer.byteLength > MAX_SAMPLE_BYTES) {
        continue;
      }
      samples.set(cluster.id, { buffer, mimeType: sample.type });
    }

    const enriched = await enrichBulkMediaClusters({ clusters, samples });
    const result =
      enriched ??
      fallbackBulkMediaClusterEnrichment({ clusters });

    logApi("info", "bulk_media_clusters_complete", {
      route: "/api/globe/bulk-media-clusters",
      method: request.method,
      requestId,
      status: 200,
      durationMs: Date.now() - started,
      detail: `${clusters.length} clusters · ${samples.size} samples · fallback=${Boolean(result.fallback)}`,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "bulk_media_clusters_failed";

    logApi("error", "bulk_media_clusters_failed", {
      route: "/api/globe/bulk-media-clusters",
      method: request.method,
      requestId,
      status: 500,
      durationMs: Date.now() - started,
      detail: message,
    });

    return NextResponse.json({ error: "bulk_media_clusters_failed" }, { status: 500 });
  }
}
