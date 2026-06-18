import { NextResponse, type NextRequest } from "next/server";
import type {
  PredictiveCurationTelemetryBatch,
  PredictiveCurationTelemetryEvent,
} from "@/types/telemetry";

const EVENT_TYPES = new Set([
  "RESOURCE_IMPRESSION",
  "RESOURCE_DISMISSED",
  "RESOURCE_MANUAL_PICK",
  "TRANSACTION_CONVERTED",
]);

function isTelemetryEvent(value: unknown): value is PredictiveCurationTelemetryEvent {
  if (!value || typeof value !== "object") {
    return false;
  }
  const row = value as PredictiveCurationTelemetryEvent;
  return (
    typeof row.event_type === "string" &&
    EVENT_TYPES.has(row.event_type) &&
    typeof row.user_id === "string" &&
    typeof row.context_id === "string" &&
    typeof row.resource_id === "string" &&
    typeof row.timestamp === "string"
  );
}

function isBatch(value: unknown): value is PredictiveCurationTelemetryBatch {
  if (!value || typeof value !== "object") {
    return false;
  }
  const batch = value as PredictiveCurationTelemetryBatch;
  return (
    Array.isArray(batch.events) &&
    batch.events.every(isTelemetryEvent) &&
    typeof batch.batch_id === "string"
  );
}

/** Mock ingest — validates batch shape; persistence deferred to Predictive Curation phase. */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!isBatch(body)) {
    return NextResponse.json({ error: "Invalid curation telemetry batch." }, { status: 400 });
  }

  if (process.env.NODE_ENV !== "production") {
    console.info(
      `[telemetry:curation] accepted ${body.events.length} events · ${body.batch_id}`,
    );
  }

  return NextResponse.json({
    ok: true,
    persisted: false,
    accepted: body.events.length,
  });
}
