import type {
  ResourcePoolItem,
  ResourcePoolItemKind,
  ResourcePoolRepo,
  ResourcePoolSnapshot,
} from "@/lib/resource-pool/resource-pool-types";

const STORAGE_KEY = "rimvio.resource-pool.v1";
const LEGACY_MEMO_KEY = "rimvio:memos";
export const RESOURCE_POOL_UPDATED = "rimvio-resource-pool-updated";

const SYSTEM_REPOS: Omit<ResourcePoolRepo, "createdAt" | "updatedAt">[] = [
  {
    id: "inbox",
    name: "inbox",
    description: "분류 전 잡동사니",
    color: "#9CA3AF",
    pinned: true,
    system: true,
  },
  {
    id: "memos",
    name: "memos",
    description: "메모 · 메모장",
    color: "#30D158",
    pinned: true,
    system: true,
  },
  {
    id: "links",
    name: "links",
    description: "링크 · 북마크",
    color: "#32D7FF",
    pinned: true,
    system: true,
  },
  {
    id: "photos",
    name: "photos",
    description: "사진 · 캡처",
    color: "#BF5AF2",
    pinned: true,
    system: true,
  },
];

type PoolState = {
  repos: ResourcePoolRepo[];
  items: ResourcePoolItem[];
};

let memoryState: PoolState | null = null;

function nowIso(): string {
  return new Date().toISOString();
}

function emitUpdated(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(RESOURCE_POOL_UPDATED));
  }
}

function defaultState(): PoolState {
  const ts = nowIso();
  return {
    repos: SYSTEM_REPOS.map((repo) => ({
      ...repo,
      createdAt: ts,
      updatedAt: ts,
    })),
    items: [],
  };
}

function readState(): PoolState {
  if (typeof window === "undefined") {
    return memoryState ?? defaultState();
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seeded = defaultState();
      migrateLegacyMemos(seeded);
      writeState(seeded);
      return seeded;
    }
    const parsed = JSON.parse(raw) as PoolState;
    return normalizeState(parsed);
  } catch {
    return defaultState();
  }
}

function writeState(state: PoolState): void {
  const normalized = normalizeState(state);
  if (typeof window === "undefined") {
    memoryState = normalized;
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  emitUpdated();
}

function normalizeState(input: PoolState): PoolState {
  const ts = nowIso();
  const repoIds = new Set(input.repos.map((repo) => repo.id));
  for (const system of SYSTEM_REPOS) {
    if (!repoIds.has(system.id)) {
      input.repos.unshift({
        ...system,
        createdAt: ts,
        updatedAt: ts,
      });
    }
  }
  return {
    repos: input.repos.sort((a, b) => {
      if (a.pinned !== b.pinned) {
        return a.pinned ? -1 : 1;
      }
      return a.name.localeCompare(b.name, "ko");
    }),
    items: input.items,
  };
}

function migrateLegacyMemos(state: PoolState): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    const raw = window.localStorage.getItem(LEGACY_MEMO_KEY);
    if (!raw) {
      return;
    }
    const lines = JSON.parse(raw) as string[];
    const ts = nowIso();
    for (const line of lines) {
      const text = line.trim();
      if (!text) {
        continue;
      }
      state.items.unshift({
        id: `rp-${crypto.randomUUID()}`,
        repoId: "memos",
        kind: "memo",
        title: text.slice(0, 48),
        body: text,
        starred: false,
        createdAt: ts,
        updatedAt: ts,
      });
    }
    window.localStorage.removeItem(LEGACY_MEMO_KEY);
  } catch {
    // ignore
  }
}

export function listResourcePoolRepos(): ResourcePoolRepo[] {
  return readState().repos;
}

export function listResourcePoolItems(repoId?: string): ResourcePoolItem[] {
  const items = readState().items;
  const filtered = repoId ? items.filter((item) => item.repoId === repoId) : items;
  return filtered.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export function countResourcePoolItems(repoId?: string): number {
  return listResourcePoolItems(repoId).length;
}

export function searchResourcePoolItems(query: string, repoId?: string): ResourcePoolItem[] {
  const needle = query.trim().toLowerCase();
  return listResourcePoolItems(repoId).filter((item) => {
    if (!needle) {
      return true;
    }
    return (
      item.title.toLowerCase().includes(needle) ||
      item.body.toLowerCase().includes(needle) ||
      (item.url?.toLowerCase().includes(needle) ?? false)
    );
  });
}

export function createResourcePoolRepo(input: {
  name: string;
  description?: string;
  color?: string;
}): ResourcePoolRepo {
  const state = readState();
  const ts = nowIso();
  const repo: ResourcePoolRepo = {
    id: `repo-${crypto.randomUUID().slice(0, 8)}`,
    name: input.name.trim().slice(0, 40) || "untitled",
    description: input.description?.trim() ?? "",
    color: input.color?.trim() || "#FFD60A",
    pinned: false,
    system: false,
    createdAt: ts,
    updatedAt: ts,
  };
  state.repos.push(repo);
  writeState(state);
  return repo;
}

export function addResourcePoolItem(input: {
  repoId?: string;
  kind: ResourcePoolItemKind;
  title: string;
  body?: string;
  url?: string;
  thumbnail?: string;
  sourceLinkId?: string;
}): ResourcePoolItem {
  const state = readState();
  const ts = nowIso();
  const repoId =
    input.repoId && state.repos.some((repo) => repo.id === input.repoId)
      ? input.repoId
      : defaultRepoForKind(input.kind);
  const item: ResourcePoolItem = {
    id: `item-${crypto.randomUUID()}`,
    repoId,
    kind: input.kind,
    title: input.title.trim().slice(0, 120) || "제목 없음",
    body: (input.body ?? input.title).trim(),
    url: input.url?.trim(),
    thumbnail: input.thumbnail?.trim(),
    sourceLinkId: input.sourceLinkId,
    starred: false,
    createdAt: ts,
    updatedAt: ts,
  };
  state.items.unshift(item);
  const repo = state.repos.find((entry) => entry.id === repoId);
  if (repo) {
    repo.updatedAt = ts;
  }
  writeState(state);
  return item;
}

function defaultRepoForKind(kind: ResourcePoolItemKind): string {
  switch (kind) {
    case "memo":
      return "memos";
    case "link":
      return "links";
    case "photo":
      return "photos";
    default:
      return "inbox";
  }
}

export function updateResourcePoolItem(
  itemId: string,
  patch: Partial<Pick<ResourcePoolItem, "title" | "body" | "url" | "repoId" | "starred">>,
): ResourcePoolItem | null {
  const state = readState();
  const index = state.items.findIndex((item) => item.id === itemId);
  if (index < 0) {
    return null;
  }
  const current = state.items[index]!;
  const updated: ResourcePoolItem = {
    ...current,
    ...patch,
    updatedAt: nowIso(),
  };
  state.items[index] = updated;
  writeState(state);
  return updated;
}

export function deleteResourcePoolItem(itemId: string): void {
  const state = readState();
  state.items = state.items.filter((item) => item.id !== itemId);
  writeState(state);
}

export function deleteResourcePoolRepo(repoId: string): boolean {
  const state = readState();
  const repo = state.repos.find((entry) => entry.id === repoId);
  if (!repo || repo.system) {
    return false;
  }
  state.repos = state.repos.filter((entry) => entry.id !== repoId);
  for (const item of state.items) {
    if (item.repoId === repoId) {
      item.repoId = "inbox";
    }
  }
  writeState(state);
  return true;
}

export function exportResourcePoolSnapshot(): string {
  const state = readState();
  const payload: ResourcePoolSnapshot = {
    version: 1,
    exportedAt: nowIso(),
    repos: state.repos,
    items: state.items,
  };
  return JSON.stringify(payload, null, 2);
}

export function importResourcePoolSnapshot(raw: string, mode: "merge" | "replace" = "merge"): void {
  const parsed = JSON.parse(raw) as ResourcePoolSnapshot;
  if (parsed.version !== 1 || !Array.isArray(parsed.items) || !Array.isArray(parsed.repos)) {
    throw new Error("지원하지 않는 리소스풀 백업 형식이에요.");
  }
  if (mode === "replace") {
    writeState(normalizeState({ repos: parsed.repos, items: parsed.items }));
    return;
  }
  const state = readState();
  const repoIds = new Set(state.repos.map((repo) => repo.id));
  for (const repo of parsed.repos) {
    if (!repoIds.has(repo.id)) {
      state.repos.push(repo);
    }
  }
  const itemIds = new Set(state.items.map((item) => item.id));
  for (const item of parsed.items) {
    if (!itemIds.has(item.id)) {
      state.items.unshift(item);
    }
  }
  writeState(state);
}

export function syncFeedLinksToResourcePool(
  links: Array<{ id: string; title: string; original_url: string; thumbnail?: string | null }>,
): number {
  const state = readState();
  const existing = new Set(
    state.items.filter((item) => item.sourceLinkId).map((item) => item.sourceLinkId!),
  );
  let added = 0;
  const ts = nowIso();
  for (const link of links) {
    if (existing.has(link.id)) {
      continue;
    }
    const isPhoto = Boolean(link.thumbnail?.startsWith("data:image"));
    state.items.unshift({
      id: `item-${crypto.randomUUID()}`,
      repoId: isPhoto ? "photos" : "links",
      kind: isPhoto ? "photo" : "link",
      title: link.title.trim() || link.original_url,
      body: link.original_url,
      url: link.original_url,
      thumbnail: link.thumbnail ?? undefined,
      sourceLinkId: link.id,
      starred: false,
      createdAt: ts,
      updatedAt: ts,
    });
    added += 1;
  }
  if (added > 0) {
    writeState(state);
  }
  return added;
}

export function resetResourcePoolForTests(state: PoolState = defaultState()): void {
  memoryState = state;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
}
