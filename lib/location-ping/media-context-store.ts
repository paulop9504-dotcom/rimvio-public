import type { MediaSpacetimeContext } from "@/lib/location-ping/types";

const DB_NAME = "rimvio-spacetime";
const DB_VERSION = 1;
const STORE = "media_context";

let memoryContexts: MediaSpacetimeContext[] = [];
let hydrated = false;

export const MEDIA_SPACETIME_UPDATED = "rimvio-media-spacetime-updated";

function emitUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(MEDIA_SPACETIME_UPDATED));
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
      if (!db.objectStoreNames.contains("gps_pings")) {
        const store = db.createObjectStore("gps_pings", { keyPath: "id" });
        store.createIndex("capturedAtIso", "capturedAtIso", { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("capturedAtIso", "capturedAtIso", { unique: false });
        store.createIndex("originRef", "originRef", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

export function resetMediaContextStoreForTests(
  contexts: MediaSpacetimeContext[] = [],
) {
  memoryContexts = contexts;
  hydrated = true;
}

export function readMediaContextMemorySnapshot(): readonly MediaSpacetimeContext[] {
  return memoryContexts;
}

export async function hydrateMediaContextStore(): Promise<readonly MediaSpacetimeContext[]> {
  if (hydrated) {
    return memoryContexts;
  }

  try {
    const db = await openDb();
    if (!db) {
      hydrated = true;
      return memoryContexts;
    }

    const rows = await new Promise<MediaSpacetimeContext[]>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const request = tx.objectStore(STORE).getAll();
      request.onsuccess = () =>
        resolve((request.result as MediaSpacetimeContext[]) ?? []);
      request.onerror = () => reject(request.error);
      tx.oncomplete = () => db.close();
      tx.onerror = () => reject(tx.error);
    });

    memoryContexts = rows.sort(
      (left, right) =>
        Date.parse(left.capturedAtIso) - Date.parse(right.capturedAtIso),
    );
    hydrated = true;
    return memoryContexts;
  } catch {
    hydrated = true;
    return memoryContexts;
  }
}

export async function saveMediaSpacetimeContext(
  context: MediaSpacetimeContext,
): Promise<MediaSpacetimeContext> {
  memoryContexts = [...memoryContexts.filter((row) => row.id !== context.id), context].sort(
    (left, right) => Date.parse(left.capturedAtIso) - Date.parse(right.capturedAtIso),
  );

  try {
    const db = await openDb();
    if (db) {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE, "readwrite");
        const request = tx.objectStore(STORE).put(context);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
        tx.oncomplete = () => db.close();
        tx.onerror = () => reject(tx.error);
      });
    }
  } catch {
    // Memory mirror is enough for client projection.
  }

  emitUpdated();
  return context;
}

export async function listMediaSpacetimeContexts(): Promise<MediaSpacetimeContext[]> {
  await hydrateMediaContextStore();
  return [...memoryContexts];
}

export async function patchMediaSpacetimeOriginRef(
  contextId: string,
  originRef: string,
): Promise<void> {
  const id = contextId.trim();
  const ref = originRef.trim();
  if (!id || !ref) {
    return;
  }
  const hit = memoryContexts.find((row) => row.id === id);
  if (!hit || hit.originRef?.trim() === ref) {
    return;
  }
  await saveMediaSpacetimeContext({ ...hit, originRef: ref });
}

export async function deleteMediaSpacetimeContext(contextId: string): Promise<void> {
  const id = contextId.trim();
  if (!id) {
    return;
  }

  memoryContexts = memoryContexts.filter((row) => row.id !== id);

  try {
    const db = await openDb();
    if (db) {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE, "readwrite");
        tx.objectStore(STORE).delete(id);
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      });
    }
  } catch {
    // Memory mirror updated.
  }

  emitUpdated();
}
