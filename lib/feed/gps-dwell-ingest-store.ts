const STORAGE_KEY = "rimvio.gps-dwell-ingested.v1";

type GpsDwellIngestRecord = {
  clusterId: string;
  eventId: string;
  ingestedAtIso: string;
};

let memoryRecords: GpsDwellIngestRecord[] = [];

function readRecords(): GpsDwellIngestRecord[] {
  if (typeof window === "undefined") {
    return [...memoryRecords];
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as GpsDwellIngestRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeRecords(records: GpsDwellIngestRecord[]) {
  memoryRecords = records;
  if (typeof window === "undefined") {
    return;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records.slice(-200)));
  } catch {
    // ignore
  }
}

export function resetGpsDwellIngestStoreForTests(records: GpsDwellIngestRecord[] = []) {
  memoryRecords = records;
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }
}

export function hasIngestedGpsDwellCluster(clusterId: string): boolean {
  const id = clusterId.trim();
  if (!id) {
    return false;
  }
  return readRecords().some((row) => row.clusterId === id);
}

export function markGpsDwellClusterIngested(input: {
  clusterId: string;
  eventId: string;
}): void {
  const clusterId = input.clusterId.trim();
  const eventId = input.eventId.trim();
  if (!clusterId || !eventId) {
    return;
  }

  const records = readRecords().filter((row) => row.clusterId !== clusterId);
  records.push({
    clusterId,
    eventId,
    ingestedAtIso: new Date().toISOString(),
  });
  writeRecords(records);
}
