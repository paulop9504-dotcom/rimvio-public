import { listContainers } from "@/lib/container-store/containers-store";
import { CANONICAL_CONTAINER_REGISTRY } from "@/lib/containers/container-types";
import type { PlaceContainerRecord } from "@/lib/data-ingestion/types";
import type { ArchitectContainerRef } from "@/lib/data-architect/types";

const PLACE_STORE_KEY = "rimvio.place-containers.v1";
let memoryPlaceStore: PlaceContainerRecord[] = [];
let memoryContextStore: ArchitectContainerRef[] = [];

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

function readContextStoreFromBrowser(): ArchitectContainerRef[] {
  if (typeof window === "undefined") {
    return [...memoryContextStore];
  }
  try {
    const raw = localStorage.getItem("rimvio.context-containers.v2");
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as Array<Record<string, unknown>>;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .map((entry) => {
        const title = typeof entry.title === "string" ? entry.title.trim() : "";
        const id = typeof entry.id === "string" ? entry.id : "";
        if (!title || !id) {
          return null;
        }
        return {
          id,
          title,
          topic: typeof entry.topic === "string" ? entry.topic : undefined,
          kind: "context" as const,
        };
      })
      .filter((entry): entry is ArchitectContainerRef => Boolean(entry));
  } catch {
    return [];
  }
}

export function resetArchitectContainerMemoryForTests(input?: {
  places?: PlaceContainerRecord[];
  contexts?: ArchitectContainerRef[];
}) {
  memoryPlaceStore = input?.places ?? [];
  memoryContextStore = input?.contexts ?? [];
}

export function upsertArchitectContextMemory(input: {
  id?: string;
  title: string;
  topic?: string;
}): ArchitectContainerRef {
  const existing = memoryContextStore.find(
    (item) => item.title === input.title.trim() || item.id === input.id
  );
  if (existing) {
    return existing;
  }
  const created: ArchitectContainerRef = {
    id: input.id ?? `ctx-${crypto.randomUUID()}`,
    title: input.title.trim(),
    topic: input.topic,
    kind: "context",
  };
  memoryContextStore = [created, ...memoryContextStore];
  return created;
}

/** Server-safe container catalog for LLM + rule matching. */
export function listExistingContainers(): ArchitectContainerRef[] {
  const canonical = Object.values(CANONICAL_CONTAINER_REGISTRY).map((preset) => ({
    id: preset.id,
    title: preset.title,
    topic: preset.topic,
    kind: "canonical" as const,
  }));

  const places = readPlaceStore()
    .map((record) => {
      const title = record.schema.name ?? record.schema.address;
      if (!title) {
        return null;
      }
      return {
        id: record.id,
        title,
        topic: "place",
        kind: "place" as const,
      };
    })
    .filter((entry): entry is ArchitectContainerRef => Boolean(entry));

  const contexts = readContextStoreFromBrowser();
  const fromStore = listContainers({ status: "active" }).map((record) => ({
    id: record.id,
    title: record.title,
    topic: record.topic,
    kind: record.kind,
  }));

  const seen = new Set<string>();
  const merged: ArchitectContainerRef[] = [];
  for (const entry of [...fromStore, ...contexts, ...places, ...canonical]) {
    const key = `${entry.kind}:${entry.id}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    merged.push(entry);
  }

  return merged;
}

export function findContainerByIdOrTitle(
  needle: string,
  containers = listExistingContainers()
): ArchitectContainerRef | null {
  const normalized = needle.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  return (
    containers.find(
      (container) =>
        container.id.toLowerCase() === normalized ||
        container.title.toLowerCase() === normalized
    ) ??
    containers.find(
      (container) =>
        container.title.toLowerCase().includes(normalized) ||
        normalized.includes(container.title.toLowerCase())
    ) ??
    null
  );
}
