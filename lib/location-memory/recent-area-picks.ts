import type { LocationSuggestion } from "@/lib/action-chat/confirmation-types";

const STORAGE_PREFIX = "rimvio-recent-area-picks";
const MAX_RECENT = 8;

export type RecentAreaPick = {
  id: string;
  label: string;
  search_query: string;
  saved_at: string;
};

function storageKey(scopeId: string): string {
  return `${STORAGE_PREFIX}:${scopeId}`;
}

function readRaw(scopeId: string): RecentAreaPick[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(storageKey(scopeId));
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as RecentAreaPick[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeRaw(scopeId: string, rows: RecentAreaPick[]): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(storageKey(scopeId), JSON.stringify(rows.slice(0, MAX_RECENT)));
  } catch {
    // quota / private mode
  }
}

export function listRecentAreaPicks(scopeId: string): RecentAreaPick[] {
  return readRaw(scopeId);
}

export function recordRecentAreaPick(
  scopeId: string,
  input: { label: string; search_query: string },
): void {
  const label = input.label.trim();
  const search_query = input.search_query.trim();
  if (!label || !search_query) {
    return;
  }

  const id = `recent-${search_query.toLowerCase().replace(/\s+/g, "-")}`;
  const next: RecentAreaPick = {
    id,
    label,
    search_query,
    saved_at: new Date().toISOString(),
  };

  const merged = [
    next,
    ...readRaw(scopeId).filter((row) => row.search_query !== search_query),
  ].slice(0, MAX_RECENT);

  writeRaw(scopeId, merged);
}

export function recentAreaPicksToSuggestions(
  picks: readonly RecentAreaPick[],
): LocationSuggestion[] {
  return picks.map((pick) => ({
    id: pick.id,
    label: pick.label,
    place_name: pick.search_query,
    address: pick.label,
    is_prior: true,
  }));
}
