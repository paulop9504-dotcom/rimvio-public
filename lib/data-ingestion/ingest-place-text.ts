import { parsePlaceIngestion } from "@/lib/data-ingestion/parse-place-ingestion";
import {
  buildActionsFromPlaceSchema,
  persistPlaceIngestion,
} from "@/lib/data-ingestion/persist-place-container";
import type { PlaceIngestionResult } from "@/lib/data-ingestion/types";

/**
 * Capture → Inference → Normalization → Storage
 */
export async function ingestPlaceText(sourceText: string): Promise<PlaceIngestionResult | null> {
  const schema = await parsePlaceIngestion(sourceText);
  if (!schema) {
    return null;
  }

  const { container, entities } = await persistPlaceIngestion({ schema, sourceText });

  return {
    schema,
    container,
    entityIds: entities.map((entity) => entity.id),
  };
}

export function buildPlaceIngestionSummary(schema: PlaceIngestionResult["schema"]): string {
  const name = schema.name ?? "장소";
  const parts = [`${name} Container를 만들었어요.`];

  if (schema.address) {
    parts.push("주소 저장됨");
  }
  if (schema.phone) {
    parts.push("전화 저장됨");
  }
  if (schema.opening_hours.status !== "unknown") {
    parts.push(`영업 ${schema.opening_hours.status === "open" ? "중" : "종료"}`);
  }

  return parts.join(" · ");
}

export function buildActionsForIngestion(result: PlaceIngestionResult) {
  return buildActionsFromPlaceSchema(result.schema);
}
