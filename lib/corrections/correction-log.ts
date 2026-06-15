import type { CorrectionLogEntry } from "@/lib/action-chat/confirmation-types";
import { mergeCorrectionLogEntries } from "@/lib/corrections/merge-correction-logs";
import {
  fetchPlaceCorrectionsFromServer,
  syncPlaceCorrectionToServer,
} from "@/lib/corrections/sync-place-corrections-client";

const DB_NAME = "rimvio-corrections";
const DB_VERSION = 1;
const STORE = "correction_log";

let memoryStore: CorrectionLogEntry[] = [];

export const CORRECTION_LOG_UPDATED = "rimvio-correction-log-updated";

function emitUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(CORRECTION_LOG_UPDATED));
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

export function resetCorrectionLogForTests(items: CorrectionLogEntry[] = []) {
  memoryStore = items;
}

export async function appendCorrectionLog(
  entry: Omit<CorrectionLogEntry, "id" | "createdAt">
): Promise<CorrectionLogEntry> {
  const row: CorrectionLogEntry = {
    ...entry,
    id: `cl-${crypto.randomUUID()}`,
    createdAt: new Date().toISOString(),
  };

  if (typeof indexedDB === "undefined") {
    memoryStore = [row, ...memoryStore].slice(0, 500);
    emitUpdated();
    void syncPlaceCorrectionToServer(row);
    return row;
  }

  try {
    await withStore("readwrite", (store) => store.put(row));
    emitUpdated();
    void syncPlaceCorrectionToServer(row);
    return row;
  } catch {
    memoryStore = [row, ...memoryStore].slice(0, 500);
    emitUpdated();
    void syncPlaceCorrectionToServer(row);
    return row;
  }
}

export async function listCorrectionLogs(
  limit = 20,
  options?: { mergeRemote?: boolean }
) {
  const local =
    typeof indexedDB === "undefined"
      ? memoryStore.slice(0, limit)
      : await (async () => {
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
        })();

  if (options?.mergeRemote !== true || typeof window === "undefined") {
    return local;
  }

  const remote = await fetchPlaceCorrectionsFromServer(limit);
  return mergeCorrectionLogEntries(local, remote).slice(0, limit);
}

export function listCorrectionLogsSync(limit = 20): CorrectionLogEntry[] {
  return memoryStore.slice(0, limit);
}
