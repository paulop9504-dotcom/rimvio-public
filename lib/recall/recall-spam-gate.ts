import { RECALL_COOLDOWN_MS, RECALL_MAX_PER_DAY } from "@/lib/recall/recall-types";

const STORAGE_KEY = "rimvio-recall-engine.v2";

type RecallShownEntry = {
  candidateId: string;
  eventId: string;
  shownAtIso: string;
};

let memoryEntries: RecallShownEntry[] = [];

function readEntries(): RecallShownEntry[] {
  if (typeof window === "undefined") {
    return memoryEntries;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as RecallShownEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeEntries(entries: RecallShownEntry[]) {
  if (typeof window === "undefined") {
    memoryEntries = entries;
    return;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // ignore quota
  }
}

function dayStartMs(now: Date): number {
  const day = new Date(now);
  day.setHours(0, 0, 0, 0);
  return day.getTime();
}

/** Daily nostalgia spam 금지 — max 1 recall / day + cooldown. */
export function canSurfaceRecallCandidate(
  candidateId: string,
  eventId: string,
  now = new Date(),
): boolean {
  const id = candidateId.trim();
  const pastEventId = eventId.trim();
  if (!id || !pastEventId) {
    return false;
  }

  const nowMs = now.getTime();
  const todayStart = dayStartMs(now);
  const entries = readEntries().filter((entry) => {
    const ms = Date.parse(entry.shownAtIso);
    return !Number.isNaN(ms) && ms >= todayStart - 7 * 86_400_000;
  });

  const todayCount = entries.filter((entry) => {
    const ms = Date.parse(entry.shownAtIso);
    return !Number.isNaN(ms) && ms >= todayStart;
  }).length;

  if (todayCount >= RECALL_MAX_PER_DAY) {
    return false;
  }

  const recent = entries
    .sort(
      (left, right) =>
        Date.parse(right.shownAtIso) - Date.parse(left.shownAtIso),
    )[0];

  if (recent) {
    const lastMs = Date.parse(recent.shownAtIso);
    if (!Number.isNaN(lastMs) && nowMs - lastMs < RECALL_COOLDOWN_MS) {
      return false;
    }
  }

  const sameEventThisWeek = entries.some((entry) => {
    if (entry.eventId !== pastEventId) {
      return false;
    }
    const ms = Date.parse(entry.shownAtIso);
    return !Number.isNaN(ms) && nowMs - ms < 7 * 86_400_000;
  });

  return !sameEventThisWeek;
}

export function markRecallCandidateShown(
  candidateId: string,
  eventId: string,
  now = new Date(),
) {
  const entries = readEntries();
  entries.push({
    candidateId: candidateId.trim(),
    eventId: eventId.trim(),
    shownAtIso: now.toISOString(),
  });
  writeEntries(entries.slice(-30));
}

export function resetRecallSpamGateForTests() {
  memoryEntries = [];
  if (typeof window === "undefined") {
    return;
  }
  localStorage.removeItem(STORAGE_KEY);
}
