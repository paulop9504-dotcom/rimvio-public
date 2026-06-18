import { resolveSessionIdForSave } from "@/lib/intent/burst-session";
import type { SaveTrajectoryEntry } from "@/lib/intent/kernel-types";

const TRAJECTORY_KEY = "rimvio:save-trajectory";
const MAX_ENTRIES = 50;

function readJson<T>(fallback: T): T {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const raw = localStorage.getItem(TRAJECTORY_KEY);
    if (!raw) {
      return fallback;
    }
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(value: unknown) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(TRAJECTORY_KEY, JSON.stringify(value));
}

export function readSaveTrajectory(): SaveTrajectoryEntry[] {
  return readJson<SaveTrajectoryEntry[]>([]);
}

export function recordSaveTrajectoryEntry(
  entry: Omit<SaveTrajectoryEntry, "session_id">
) {
  const existing = readSaveTrajectory();
  const now = Date.parse(entry.timestamp) || Date.now();
  const preview = [entry, ...existing];
  const session_id = resolveSessionIdForSave(preview, now);
  const stamped: SaveTrajectoryEntry = { ...entry, session_id };
  const next = [
    stamped,
    ...existing.filter((item) => item.timestamp !== entry.timestamp),
  ].slice(0, MAX_ENTRIES);
  writeJson(next);
}

export function linksToSaveTrajectory(
  links: Array<{
    created_at: string;
    category: string | null;
    title: string;
    domain: string | null;
    source_type?: string | null;
    original_url?: string;
  }>
): SaveTrajectoryEntry[] {
  return links.map((link) => ({
    timestamp: link.created_at,
    category: link.category ?? "uncategorized",
    title: link.title,
    domain: link.domain,
    source_type: link.source_type ?? null,
  }));
}
