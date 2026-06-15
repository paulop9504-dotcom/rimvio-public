import type { GroupTalkTarget } from "@/lib/peer-chat/group-talk-target-types";

const CACHE_KEY = "rimvio-group-threads-cache";

export function readGroupThreadsCache(): GroupTalkTarget[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .map((row) => {
        if (!row || typeof row !== "object") {
          return null;
        }
        const peerThreadId = String(
          (row as { peerThreadId?: string }).peerThreadId ?? "",
        ).trim();
        const displayName = String(
          (row as { displayName?: string }).displayName ?? "",
        ).trim();
        if (!peerThreadId || !displayName) {
          return null;
        }
        return { peerThreadId, displayName };
      })
      .filter((row): row is GroupTalkTarget => row !== null);
  } catch {
    return [];
  }
}

export function writeGroupThreadsCache(groups: readonly GroupTalkTarget[]): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(groups));
  } catch {
    // ignore quota errors
  }
}

export function upsertGroupThreadCache(entry: GroupTalkTarget): void {
  const prev = readGroupThreadsCache();
  const next = [
    entry,
    ...prev.filter((row) => row.peerThreadId !== entry.peerThreadId),
  ];
  writeGroupThreadsCache(next);
}

export function removeGroupThreadCache(threadId: string): void {
  const prev = readGroupThreadsCache();
  writeGroupThreadsCache(
    prev.filter((row) => row.peerThreadId !== threadId),
  );
}
