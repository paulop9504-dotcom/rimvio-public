import { CANONICAL_CONTAINER_REGISTRY } from "@/lib/containers/container-types";
import type { ContainerKnowledgeItem, ContainerRecord } from "@/lib/container-store/types";
import { DEFAULT_VITALITY_TAG, normalizeVitalityTag } from "@/lib/vitality/types";

const STORE_KEY = "rimvio.containers.v1";

let memoryStore: ContainerRecord[] = [];

function nowIso() {
  return new Date().toISOString();
}

function normalizeContainerRecord(record: ContainerRecord): ContainerRecord {
  return {
    ...record,
    vitality_tag: normalizeVitalityTag(record.vitality_tag),
  };
}

function seedCanonicalContainers(): ContainerRecord[] {
  const now = nowIso();
  return Object.values(CANONICAL_CONTAINER_REGISTRY).map((preset) => ({
    id: preset.id,
    goal: preset.persona,
    title: preset.title,
    status: "active" as const,
    knowledge: [],
    topic: preset.topic,
    kind: "canonical" as const,
    vitality_tag: DEFAULT_VITALITY_TAG,
    created_at: now,
    updated_at: now,
    last_active_at: now,
  }));
}

function readStore(): ContainerRecord[] {
  if (typeof window === "undefined") {
    return memoryStore.length ? [...memoryStore] : seedCanonicalContainers();
  }
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) {
      const seeded = seedCanonicalContainers();
      writeStore(seeded);
      return seeded;
    }
    const parsed = JSON.parse(raw) as ContainerRecord[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      const seeded = seedCanonicalContainers();
      writeStore(seeded);
      return seeded;
    }
    return parsed.map(normalizeContainerRecord);
  } catch {
    return seedCanonicalContainers();
  }
}

function writeStore(records: ContainerRecord[]) {
  if (typeof window === "undefined") {
    memoryStore = records;
    return;
  }
  localStorage.setItem(STORE_KEY, JSON.stringify(records.slice(0, 300)));
}

export function resetContainerStoreForTests(records: ContainerRecord[] = []) {
  memoryStore = records.length ? records : seedCanonicalContainers();
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORE_KEY);
  }
}

export function listContainers(options?: { status?: "active" | "archived" }): ContainerRecord[] {
  const items = readStore().sort(
    (a, b) => new Date(b.last_active_at).getTime() - new Date(a.last_active_at).getTime()
  );
  if (!options?.status) {
    return items;
  }
  return items.filter((item) => item.status === options.status);
}

export function getContainerById(id: string): ContainerRecord | null {
  return readStore().find((item) => item.id === id) ?? null;
}

export function listActiveContainers(withinMs = 24 * 60 * 60 * 1000): ContainerRecord[] {
  const cutoff = Date.now() - withinMs;
  return listContainers({ status: "active" }).filter(
    (item) => new Date(item.last_active_at).getTime() >= cutoff
  );
}

export function touchContainer(id: string): ContainerRecord | null {
  const now = nowIso();
  const next = readStore().map((item) =>
    item.id === id ? { ...item, last_active_at: now, updated_at: now } : item
  );
  writeStore(next);
  return getContainerById(id);
}

export function createContainer(input: {
  id?: string;
  title: string;
  goal: string;
  topic?: string;
  kind?: ContainerRecord["kind"];
  knowledge?: ContainerKnowledgeItem[];
  vitality_tag?: ContainerRecord["vitality_tag"];
}): ContainerRecord {
  const now = nowIso();
  const existing = readStore().find(
    (item) => item.title.trim() === input.title.trim() || item.id === input.id
  );
  if (existing) {
    return touchContainer(existing.id) ?? existing;
  }

  const created: ContainerRecord = {
    id: input.id ?? `ctx-${crypto.randomUUID()}`,
    goal: input.goal.trim(),
    title: input.title.trim(),
    status: "active",
    knowledge: input.knowledge ?? [],
    topic: input.topic,
    kind: input.kind ?? "context",
    vitality_tag: input.vitality_tag ?? DEFAULT_VITALITY_TAG,
    created_at: now,
    updated_at: now,
    last_active_at: now,
  };

  writeStore([created, ...readStore()]);
  return created;
}

export function appendContainerKnowledge(
  containerId: string,
  items: Array<Omit<ContainerKnowledgeItem, "id" | "created_at">>
): ContainerRecord | null {
  const now = nowIso();
  const nextItems: ContainerKnowledgeItem[] = items.map((item) => ({
    ...item,
    id: `ck-${crypto.randomUUID()}`,
    created_at: now,
  }));

  const next = readStore().map((item) => {
    if (item.id !== containerId) {
      return item;
    }
    return {
      ...item,
      knowledge: [...nextItems, ...item.knowledge].slice(0, 100),
      updated_at: now,
      last_active_at: now,
    };
  });

  writeStore(next);
  return getContainerById(containerId);
}
