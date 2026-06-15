const STORAGE_KEY = "rimvio.media-context-ingest.v1";

let memoryProcessed = new Set<string>();

function readSet(): Set<string> {
  if (typeof window === "undefined") {
    return memoryProcessed;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return new Set();
    }
    const parsed = JSON.parse(raw) as string[];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function writeSet(ids: Set<string>) {
  const rows = [...ids].slice(-500);
  memoryProcessed = new Set(rows);
  if (typeof window === "undefined") {
    return;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  } catch {
    // ignore quota
  }
}

export function isMediaContextIngestProcessed(contextId: string): boolean {
  const key = contextId.trim();
  if (!key) {
    return true;
  }
  return readSet().has(key);
}

export function markMediaContextIngestProcessed(contextId: string) {
  const key = contextId.trim();
  if (!key) {
    return;
  }
  const next = readSet();
  next.add(key);
  writeSet(next);
}

export function resetMediaContextIngestTrackerForTests() {
  memoryProcessed = new Set();
  if (typeof window === "undefined") {
    return;
  }
  localStorage.removeItem(STORAGE_KEY);
}
