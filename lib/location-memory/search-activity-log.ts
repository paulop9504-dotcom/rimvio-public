import { extractRegionLabel } from "@/lib/location-memory/extract-region-label";
import type { SearchActivityEntry, SearchActivityKind } from "@/lib/location-memory/types";

const DB_NAME = "rimvio-location-memory";
const DB_VERSION = 1;
const STORE = "search_activity";

let memoryStore: SearchActivityEntry[] = [];

export const SEARCH_ACTIVITY_UPDATED = "rimvio-search-activity-updated";

function emitUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(SEARCH_ACTIVITY_UPDATED));
  }
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
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
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

export function resetSearchActivityLogForTests(items: SearchActivityEntry[] = []) {
  memoryStore = items;
}

export async function appendSearchActivity(input: {
  query: string;
  kind: SearchActivityKind;
  place_label?: string | null;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
}): Promise<SearchActivityEntry> {
  const trimmed = input.query.trim();
  if (!trimmed) {
    throw new Error("search_activity_query_required");
  }

  const row: SearchActivityEntry = {
    id: `sa-${crypto.randomUUID()}`,
    query: trimmed.slice(0, 120),
    kind: input.kind,
    region_label: extractRegionLabel({
      query: trimmed,
      address: input.address,
    }),
    place_label: input.place_label?.trim().slice(0, 80) ?? null,
    lat: input.lat ?? null,
    lng: input.lng ?? null,
    createdAt: new Date().toISOString(),
  };

  if (typeof indexedDB === "undefined") {
    memoryStore = [row, ...memoryStore].slice(0, 200);
    emitUpdated();
    return row;
  }

  try {
    await withStore("readwrite", (store) => store.put(row));
    emitUpdated();
    return row;
  } catch {
    memoryStore = [row, ...memoryStore].slice(0, 200);
    emitUpdated();
    return row;
  }
}

export async function listSearchActivities(limit = 10): Promise<SearchActivityEntry[]> {
  if (typeof indexedDB === "undefined") {
    return memoryStore.slice(0, limit);
  }

  try {
    const all = await withStore("readonly", (store) => store.getAll());
    return all
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .slice(0, limit);
  } catch {
    return memoryStore.slice(0, limit);
  }
}

export function listSearchActivitiesSync(limit = 10): SearchActivityEntry[] {
  return memoryStore.slice(0, limit);
}
