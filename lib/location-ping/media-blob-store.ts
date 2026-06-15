const DB_NAME = "rimvio-media-blobs";
const DB_VERSION = 1;
const STORE = "blobs";

const memoryUrls = new Map<string, string>();

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
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

export async function saveMediaBlob(id: string, file: File): Promise<void> {
  const key = id.trim();
  if (!key) {
    return;
  }

  const previous = memoryUrls.get(key);
  if (previous) {
    URL.revokeObjectURL(previous);
    memoryUrls.delete(key);
  }

  try {
    const db = await openDb();
    if (db) {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE, "readwrite");
        tx.objectStore(STORE).put({ id: key, blob: file, mimeType: file.type });
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      });
    }
  } catch {
    // Memory URL fallback below.
  }

  memoryUrls.set(key, URL.createObjectURL(file));
}

export async function deleteMediaBlob(id: string): Promise<void> {
  const key = id.trim();
  if (!key) {
    return;
  }

  const previous = memoryUrls.get(key);
  if (previous) {
    URL.revokeObjectURL(previous);
    memoryUrls.delete(key);
  }

  try {
    const db = await openDb();
    if (!db) {
      return;
    }
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(key);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Memory cache already cleared.
  }
}

async function readMediaBlobRow(
  id: string,
): Promise<{ blob: Blob; mimeType?: string } | null> {
  const key = id.trim();
  if (!key) {
    return null;
  }

  try {
    const db = await openDb();
    if (!db) {
      return null;
    }

    const row = await new Promise<{ blob: Blob; mimeType?: string } | null>(
      (resolve, reject) => {
        const tx = db.transaction(STORE, "readonly");
        const request = tx.objectStore(STORE).get(key);
        request.onsuccess = () =>
          resolve(
            (request.result as { blob: Blob; mimeType?: string } | undefined) ??
              null,
          );
        request.onerror = () => reject(request.error);
        tx.oncomplete = () => db.close();
        tx.onerror = () => reject(tx.error);
      },
    );

    return row?.blob ? row : null;
  } catch {
    return null;
  }
}

/** Raw blob for server upload (Experience Bridge share). */
export async function readMediaBlob(id: string): Promise<Blob | null> {
  const row = await readMediaBlobRow(id);
  return row?.blob ?? null;
}

export async function readMediaBlobUrl(id: string): Promise<string | null> {
  const key = id.trim();
  if (!key) {
    return null;
  }

  const cached = memoryUrls.get(key);
  if (cached) {
    return cached;
  }

  const row = await readMediaBlobRow(key);
  if (!row?.blob) {
    return null;
  }

  const url = URL.createObjectURL(row.blob);
  memoryUrls.set(key, url);
  return url;
}

export function parseUploadMediaContextId(itemId: string): string | null {
  const trimmed = itemId.trim();
  if (!trimmed.startsWith("upload:")) {
    return null;
  }
  return trimmed.slice("upload:".length) || null;
}
