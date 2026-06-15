import { isMessyPlaceDump } from "@/lib/action-chat/clean-entity-text";
import type { OrchestratorResult } from "@/lib/action-chat/orchestrator-types";
import {
  buildActionsForIngestion,
  buildPlaceIngestionSummary,
  ingestPlaceText,
} from "@/lib/data-ingestion/ingest-place-text";
import type { PlaceIngestionSchema } from "@/lib/data-ingestion/types";

function mapKnowledgeWire(schema: PlaceIngestionSchema) {
  return [
    schema.name
      ? { label: schema.name, value: schema.address ?? schema.name, type: "place" as const }
      : null,
    schema.phone ? { label: "전화", value: schema.phone, type: "phone" as const } : null,
  ].filter(Boolean) as Array<{ label: string; value: string; type: string }>;
}

export async function orchestratePlaceIngestion(message: string): Promise<OrchestratorResult | null> {
  if (!isMessyPlaceDump(message)) {
    return null;
  }

  const ingested = await ingestPlaceText(message);
  if (!ingested) {
    return null;
  }

  return {
    summary: buildPlaceIngestionSummary(ingested.schema),
    actions: buildActionsForIngestion(ingested),
    source: "rules",
    confidence: 0.9,
    actionsRevealed: true,
    pendingConfirm: false,
    knowledgeSaved: mapKnowledgeWire(ingested.schema),
    metadata: {
      intent: "ACTION",
      trust_level_adjustment: "NONE",
    },
  };
}
