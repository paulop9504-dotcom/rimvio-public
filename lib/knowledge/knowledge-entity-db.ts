import type {
  KnowledgeContainerId,
  KnowledgeEntity,
  KnowledgeEntityType,
} from "@/lib/knowledge/knowledge-entity-types";

const DB_NAME = "rimvio-knowledge";
const DB_VERSION = 1;
const STORE = "entities";
export const KNOWLEDGE_ENTITY_UPDATED = "rimvio-knowledge-entity-updated";

let memoryStore: KnowledgeEntity[] = [];

function normalizeSearchText(input: string) {
  return input
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^\p{L}\p{N}\s+-]/gu, " ")
    .trim();
}

function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") {
    return Promise.resolve(null);
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("containerId", "containerId", { unique: false });
        store.createIndex("searchText", "searchText", { unique: false });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

function emitUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(KNOWLEDGE_ENTITY_UPDATED));
  }
}

async function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T> | Promise<T>
): Promise<T> {
  const db = await openDb();
  if (!db) {
    throw new Error("indexeddb_unavailable");
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const store = tx.objectStore(STORE);
    Promise.resolve(run(store))
      .then((result) => {
        if (result instanceof IDBRequest) {
          result.onsuccess = () => resolve(result.result as T);
          result.onerror = () => reject(result.error);
        } else {
          resolve(result as T);
        }
      })
      .catch(reject);
    tx.oncomplete = () => db.close();
    tx.onerror = () => reject(tx.error);
  });
}

function putMemory(entity: KnowledgeEntity) {
  memoryStore = [entity, ...memoryStore.filter((item) => item.id !== entity.id)].slice(
    0,
    500
  );
  emitUpdated();
  return entity;
}

export function resetKnowledgeEntityMemoryForTests(items: KnowledgeEntity[] = []) {
  memoryStore = items;
}

export async function saveKnowledgeEntity(input: {
  containerId: KnowledgeContainerId;
  type: KnowledgeEntityType;
  label: string;
  value: string;
  sourceMessage?: string;
  sourceLinkId?: string;
  topicContainerId?: string;
  scheduledAt?: string;
  id?: string;
}): Promise<KnowledgeEntity> {
  const entity: KnowledgeEntity = {
    id: input.id ?? `ke-${crypto.randomUUID()}`,
    containerId: input.containerId,
    type: input.type,
    label: input.label.trim(),
    value: input.value.trim(),
    searchText: normalizeSearchText(
      `${input.label} ${input.value} ${input.sourceMessage ?? ""} ${input.topicContainerId ?? ""}`
    ),
    sourceMessage: input.sourceMessage?.trim(),
    sourceLinkId: input.sourceLinkId,
    topicContainerId: input.topicContainerId,
    scheduledAt: input.scheduledAt,
    createdAt: new Date().toISOString(),
  };

  if (typeof indexedDB === "undefined") {
    return putMemory(entity);
  }

  try {
    await withStore("readwrite", (store) => store.put(entity));
    emitUpdated();
    return entity;
  } catch {
    return putMemory(entity);
  }
}

async function readAllEntities(): Promise<KnowledgeEntity[]> {
  if (typeof indexedDB === "undefined") {
    return [...memoryStore];
  }

  try {
    return await withStore("readonly", (store) => store.getAll());
  } catch {
    return [...memoryStore];
  }
}

export async function searchKnowledgeEntities(input: {
  query: string;
  containerId?: KnowledgeContainerId;
  limit?: number;
}): Promise<KnowledgeEntity[]> {
  const needle = normalizeSearchText(input.query);
  const limit = input.limit ?? 8;
  const all = await readAllEntities();

  const filtered = all
    .filter((entity) =>
      input.containerId ? entity.containerId === input.containerId : true
    )
    .filter((entity) => {
      if (!needle) {
        return true;
      }
      return entity.searchText.includes(needle) || entity.value.includes(input.query.trim());
    })
    .sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

  return filtered.slice(0, limit);
}

export async function getRecentKnowledgeEntities(input?: {
  containerId?: KnowledgeContainerId;
  limit?: number;
}) {
  const all = await readAllEntities();
  return all
    .filter((entity) =>
      input?.containerId ? entity.containerId === input.containerId : true
    )
    .sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, input?.limit ?? 10);
}

export async function getKnowledgeEntityById(id: string) {
  const all = await readAllEntities();
  return all.find((entity) => entity.id === id) ?? null;
}
