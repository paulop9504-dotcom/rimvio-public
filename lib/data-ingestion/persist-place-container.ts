import { buildEntityArchitectFromInfo } from "@/lib/action-chat/build-entity-actions";
import type { ExtractedPlaceInfo } from "@/lib/action-chat/entity-cleaner-types";
import { normalizeAddressPair } from "@/lib/action-chat/normalize-address";
import {
  FIXED_DATA_CONTAINER_ID,
  type KnowledgeEntity,
} from "@/lib/knowledge/knowledge-entity-types";
import { saveKnowledgeEntity } from "@/lib/knowledge/knowledge-entity-db";
import type {
  PlaceContainerRecord,
  PlaceIngestionSchema,
} from "@/lib/data-ingestion/types";

const PLACE_STORE_KEY = "rimvio.place-containers.v1";

let memoryPlaceStore: PlaceContainerRecord[] = [];

function normalizeSearchText(input: string) {
  return input
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^\p{L}\p{N}\s+-]/gu, " ")
    .trim();
}

function readPlaceStore(): PlaceContainerRecord[] {
  if (typeof window === "undefined") {
    return [...memoryPlaceStore];
  }
  try {
    const raw = localStorage.getItem(PLACE_STORE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as PlaceContainerRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writePlaceStore(records: PlaceContainerRecord[]) {
  if (typeof window === "undefined") {
    memoryPlaceStore = records;
    return;
  }
  localStorage.setItem(PLACE_STORE_KEY, JSON.stringify(records.slice(0, 200)));
}

export function resetPlaceContainerStoreForTests(records: PlaceContainerRecord[] = []) {
  memoryPlaceStore = records;
  if (typeof window !== "undefined") {
    localStorage.removeItem(PLACE_STORE_KEY);
  }
}

function schemaToExtractedInfo(schema: PlaceIngestionSchema): ExtractedPlaceInfo {
  return {
    name: schema.name,
    branch: schema.features[0] ?? null,
    address: schema.address ? normalizeAddressPair(schema.address) : null,
    phone: schema.phone,
    website: schema.homepage,
    hours: schema.opening_hours.raw ?? null,
    is_open:
      schema.opening_hours.status === "open"
        ? true
        : schema.opening_hours.status === "closed"
          ? false
          : null,
  };
}

export function upsertPlaceContainer(input: {
  schema: PlaceIngestionSchema;
  sourceText: string;
}): PlaceContainerRecord {
  const label = input.schema.name ?? input.schema.address ?? "장소";
  const searchText = normalizeSearchText(
    `${label} ${input.schema.address ?? ""} ${input.schema.features.join(" ")}`
  );
  const existing = readPlaceStore().find(
    (record) => record.searchText === searchText || record.schema.name === input.schema.name
  );
  const now = new Date().toISOString();

  const record: PlaceContainerRecord = {
    id: existing?.id ?? `place-${crypto.randomUUID()}`,
    schema: input.schema,
    searchText,
    sourceText: input.sourceText.slice(0, 2000),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  const next = [record, ...readPlaceStore().filter((item) => item.id !== record.id)].slice(0, 200);
  writePlaceStore(next);
  return record;
}

/** Storage — place container + knowledge entities for recall/actions. */
export async function persistPlaceIngestion(input: {
  schema: PlaceIngestionSchema;
  sourceText: string;
}): Promise<{ container: PlaceContainerRecord; entities: KnowledgeEntity[] }> {
  const container = upsertPlaceContainer(input);
  const entities: KnowledgeEntity[] = [];
  const label = input.schema.name ?? "장소";

  entities.push(
    await saveKnowledgeEntity({
      containerId: FIXED_DATA_CONTAINER_ID,
      type: "place",
      label,
      value: JSON.stringify(input.schema),
      sourceMessage: input.sourceText.slice(0, 500),
    })
  );

  if (input.schema.phone) {
    entities.push(
      await saveKnowledgeEntity({
        containerId: FIXED_DATA_CONTAINER_ID,
        type: "phone",
        label: `${label} 전화`,
        value: input.schema.phone.replace(/\D/g, ""),
        sourceMessage: input.sourceText.slice(0, 500),
      })
    );
  }

  if (input.schema.address) {
    entities.push(
      await saveKnowledgeEntity({
        containerId: FIXED_DATA_CONTAINER_ID,
        type: "text",
        label: `${label} 주소`,
        value: input.schema.address,
        sourceMessage: input.sourceText.slice(0, 500),
      })
    );
  }

  return { container, entities };
}

export function buildActionsFromPlaceSchema(schema: PlaceIngestionSchema) {
  return buildEntityArchitectFromInfo(schemaToExtractedInfo(schema)).actions;
}

export async function findPlaceContainerByQuery(query: string) {
  const needle = normalizeSearchText(query);
  if (!needle) {
    return null;
  }
  return (
    readPlaceStore().find(
      (record) =>
        record.searchText.includes(needle) ||
        (record.schema.name?.toLowerCase().includes(needle) ?? false)
    ) ?? null
  );
}
