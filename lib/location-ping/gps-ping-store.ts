import {
  GPS_PING_MAX_AGE_MS,
  GPS_PING_MAX_COUNT,
} from "@/lib/location-ping/constants";
import type { GpsPing, GpsPingSource } from "@/lib/location-ping/types";

const DB_NAME = "rimvio-spacetime";
const DB_VERSION = 1;
const STORE = "gps_pings";

let memoryPings: GpsPing[] = [];
let hydrated = false;

export const GPS_PINGS_UPDATED = "rimvio-gps-pings-updated";

function emitUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(GPS_PINGS_UPDATED));
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
        store.createIndex("capturedAtIso", "capturedAtIso", { unique: false });
      }
      if (!db.objectStoreNames.contains("media_context")) {
        const store = db.createObjectStore("media_context", { keyPath: "id" });
        store.createIndex("capturedAtIso", "capturedAtIso", { unique: false });
        store.createIndex("originRef", "originRef", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T> | Promise<T>,
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

function prunePings(pings: GpsPing[], nowMs: number): GpsPing[] {
  const minMs = nowMs - GPS_PING_MAX_AGE_MS;
  return pings
    .filter((ping) => {
      const ms = Date.parse(ping.capturedAtIso);
      return !Number.isNaN(ms) && ms >= minMs;
    })
    .sort((left, right) => Date.parse(left.capturedAtIso) - Date.parse(right.capturedAtIso))
    .slice(-GPS_PING_MAX_COUNT);
}

export function resetGpsPingStoreForTests(pings: GpsPing[] = []) {
  memoryPings = pings;
  hydrated = true;
}

export function readGpsPingMemorySnapshot(): readonly GpsPing[] {
  return memoryPings;
}

export async function hydrateGpsPingStore(): Promise<readonly GpsPing[]> {
  if (hydrated) {
    return memoryPings;
  }

  try {
    const db = await openDb();
    if (!db) {
      hydrated = true;
      return memoryPings;
    }

    const rows = await new Promise<GpsPing[]>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const request = tx.objectStore(STORE).getAll();
      request.onsuccess = () => resolve((request.result as GpsPing[]) ?? []);
      request.onerror = () => reject(request.error);
      tx.oncomplete = () => db.close();
      tx.onerror = () => reject(tx.error);
    });

    memoryPings = prunePings(rows, Date.now());
    hydrated = true;
    return memoryPings;
  } catch {
    hydrated = true;
    return memoryPings;
  }
}

export async function appendGpsPing(input: {
  lat: number;
  lng: number;
  accuracyM?: number | null;
  source?: GpsPingSource;
  capturedAtIso?: string;
}): Promise<GpsPing> {
  const ping: GpsPing = {
    id: crypto.randomUUID(),
    lat: input.lat,
    lng: input.lng,
    accuracyM:
      typeof input.accuracyM === "number" && Number.isFinite(input.accuracyM)
        ? input.accuracyM
        : null,
    capturedAtIso: input.capturedAtIso ?? new Date().toISOString(),
    source: input.source ?? "periodic",
  };

  memoryPings = prunePings([...memoryPings, ping], Date.now());

  try {
    const db = await openDb();
    if (db) {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE, "readwrite");
        const request = tx.objectStore(STORE).put(ping);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
        tx.oncomplete = () => db.close();
        tx.onerror = () => reject(tx.error);
      });
    }
  } catch {
    // Memory mirror still works offline.
  }

  emitUpdated();
  return ping;
}

export async function listRecentGpsPings(limit = GPS_PING_MAX_COUNT): Promise<GpsPing[]> {
  await hydrateGpsPingStore();
  return memoryPings.slice(-limit);
}
