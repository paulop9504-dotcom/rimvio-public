const STREAM_STORE_KEY = "rimvio.container-stream.v1";

let memoryStreamStore: StreamRecord[] = [];

export type StreamRecord = {
  id: string;
  container_id: string;
  container_title: string;
  text: string;
  createdAt: string;
};

export function resetStreamStoreForTests(records: StreamRecord[] = []) {
  memoryStreamStore = records;
  if (typeof window !== "undefined") {
    localStorage.removeItem(STREAM_STORE_KEY);
  }
}

function readStreamStore(): StreamRecord[] {
  if (typeof window === "undefined") {
    return [...memoryStreamStore];
  }
  try {
    const raw = localStorage.getItem(STREAM_STORE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as StreamRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStreamStore(records: StreamRecord[]) {
  if (typeof window === "undefined") {
    memoryStreamStore = records;
    return;
  }
  localStorage.setItem(STREAM_STORE_KEY, JSON.stringify(records.slice(0, 500)));
}

export function appendStreamRecords(input: {
  container_id: string;
  container_title: string;
  items: string[];
}): StreamRecord[] {
  const now = new Date().toISOString();
  const created = input.items.map((text) => ({
    id: `stream-${crypto.randomUUID()}`,
    container_id: input.container_id,
    container_title: input.container_title,
    text: text.trim(),
    createdAt: now,
  }));

  writeStreamStore([...created, ...readStreamStore()]);
  return created;
}

export function listStreamRecordsForContainer(containerId: string, limit = 20) {
  return readStreamStore()
    .filter((record) => record.container_id === containerId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}
