export type NexusContact = {
  id: string;
  name: string;
  title?: string;
  lastContactAt?: string;
  importance: number;
  notes: string[];
  updatedAt: string;
};

const STORAGE_KEY = "rimvio-nexus-contacts.v1";
let memoryStore: NexusContact[] = [];

function readJson(): NexusContact[] {
  if (typeof window === "undefined") {
    return [...memoryStore];
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as NexusContact[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeJson(items: NexusContact[]) {
  if (typeof window === "undefined") {
    memoryStore = items;
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, 200)));
}

export function resetNexusContactsForTests(items: NexusContact[] = []) {
  memoryStore = items;
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }
}

export function upsertNexusContact(
  input: Omit<NexusContact, "id" | "updatedAt"> & { id?: string }
): NexusContact {
  const record: NexusContact = {
    id: input.id ?? `nx-${crypto.randomUUID()}`,
    name: input.name.trim(),
    title: input.title?.trim(),
    lastContactAt: input.lastContactAt,
    importance: input.importance ?? 3,
    notes: input.notes ?? [],
    updatedAt: new Date().toISOString(),
  };
  writeJson([
    record,
    ...readJson().filter((item) => item.name !== record.name),
  ]);
  return record;
}

export function findNexusContactByName(name: string): NexusContact | null {
  const needle = name.trim();
  return readJson().find((item) => item.name === needle) ?? null;
}

export function listNexusContacts(limit = 20): NexusContact[] {
  return readJson().slice(0, limit);
}

export function serializeNexusContactsForApi() {
  return listNexusContacts(10).map((item) => ({
    name: item.name,
    title: item.title ?? null,
    lastContactAt: item.lastContactAt ?? null,
    importance: item.importance,
  }));
}

const NAME_IN_MESSAGE =
  /([가-힣]{2,4})\s*(?:님|씨)?\s*(?:상담|미팅|회의|만남|연락|안부|전화)/u;

export function extractNexusContactFromMessage(message: string): NexusContact | null {
  const match = message.match(NAME_IN_MESSAGE);
  const name = match?.[1]?.trim();
  if (!name) {
    return null;
  }
  const existing = findNexusContactByName(name);
  return (
    existing ?? {
      id: `nx-draft-${name}`,
      name,
      importance: 3,
      notes: [],
      updatedAt: new Date().toISOString(),
    }
  );
}

export function touchNexusContact(name: string) {
  const existing = findNexusContactByName(name);
  if (existing) {
    upsertNexusContact({ ...existing, lastContactAt: new Date().toISOString() });
    return;
  }
  upsertNexusContact({
    name,
    importance: 3,
    notes: [],
    lastContactAt: new Date().toISOString(),
  });
}
