import type {
  ConversationMemoryRecord,
  ConversationMemoryWire,
} from "@/lib/conversation-memory/types";

const STORAGE_KEY = "rimvio-conversation-memory.v1";
let memoryRecords: ConversationMemoryRecord[] = [];

export function resetConversationMemoryForTests(
  items: ConversationMemoryRecord[] = []
) {
  memoryRecords = items;
}

function readJson(): ConversationMemoryRecord[] {
  if (typeof window === "undefined") {
    return [...memoryRecords];
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as ConversationMemoryRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeJson(items: ConversationMemoryRecord[]) {
  if (typeof window === "undefined") {
    memoryRecords = items;
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, 80)));
}

export function listConversationMemories(limit = 20): ConversationMemoryRecord[] {
  return readJson()
    .sort(
      (left, right) =>
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    )
    .slice(0, limit);
}

export function serializeConversationMemoriesForApi(): ConversationMemoryWire[] {
  return listConversationMemories(30).map((item) => ({
    id: item.id,
    topic: item.topic,
    summary: item.summary,
    keywords: item.keywords,
    createdAt: item.createdAt,
  }));
}

export function saveConversationMemory(
  input: Omit<ConversationMemoryRecord, "id" | "createdAt"> & { id?: string }
): ConversationMemoryRecord {
  const record: ConversationMemoryRecord = {
    id: input.id ?? `cm-${crypto.randomUUID()}`,
    topic: input.topic.trim().slice(0, 48),
    summary: input.summary.trim().slice(0, 280),
    keywords: input.keywords.slice(0, 12),
    messageCount: input.messageCount,
    createdAt: new Date().toISOString(),
  };

  writeJson([record, ...readJson().filter((item) => item.id !== record.id)]);
  return record;
}

export function searchConversationMemories(input: {
  query: string;
  limit?: number;
  records?: ConversationMemoryWire[];
}): ConversationMemoryWire[] {
  const needle = input.query.trim().toLowerCase();
  const pool = input.records ?? listConversationMemories(40);

  if (!needle) {
    return pool.slice(0, input.limit ?? 3);
  }

  const tokens = needle
    .split(/\s+/u)
    .filter((part) => part.length >= 2)
    .slice(0, 6);

  const scored = pool
    .map((item) => {
      const haystack = `${item.topic} ${item.summary} ${item.keywords.join(" ")}`.toLowerCase();
      let score = 0;
      for (const token of tokens) {
        if (haystack.includes(token)) {
          score += token.length >= 3 ? 3 : 2;
        }
      }
      if (haystack.includes(needle)) {
        score += 5;
      }
      return { item, score };
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, input.limit ?? 3).map((row) => row.item);
}

export function memoriesFromWire(
  wire: ConversationMemoryWire[] | undefined
): ConversationMemoryWire[] {
  return wire ?? [];
}
