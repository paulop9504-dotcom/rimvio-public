import type { LensActionType } from "@/lib/peer-chat/ai-lens/types";

const STORAGE_KEY = "rimvio.peer-lens-history.v1";

export type LensHistoryEntry = {
  actionType: LensActionType;
  shown: number;
  clicked: number;
};

type Store = Record<string, LensHistoryEntry>;

let memory: Store = {};

function readStore(): Store {
  if (typeof window === "undefined") {
    return { ...memory };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }
    return JSON.parse(raw) as Store;
  } catch {
    return {};
  }
}

function writeStore(store: Store) {
  if (typeof window === "undefined") {
    memory = store;
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function resetLensUserHistoryForTests(entries: LensHistoryEntry[] = []) {
  const store: Store = {};
  for (const entry of entries) {
    store[entry.actionType] = { ...entry };
  }
  writeStore(store);
}

/** 0.35–1.0 weight from click rate (defaults 0.65). */
export function lensUserHistoryWeight(actionType: LensActionType): number {
  const entry = readStore()[actionType];
  if (!entry || entry.shown < 2) {
    return 0.65;
  }
  const rate = entry.clicked / Math.max(entry.shown, 1);
  return Math.max(0.35, Math.min(1, 0.35 + rate * 0.65));
}

export function recordLensBubbleShown(actionTypes: readonly LensActionType[]) {
  const store = readStore();
  for (const actionType of actionTypes) {
    const prev = store[actionType] ?? { actionType, shown: 0, clicked: 0 };
    store[actionType] = { ...prev, shown: prev.shown + 1 };
  }
  writeStore(store);
}

export function recordLensBubbleClick(actionType: LensActionType) {
  const store = readStore();
  const prev = store[actionType] ?? { actionType, shown: 0, clicked: 0 };
  store[actionType] = {
    ...prev,
    shown: prev.shown + 1,
    clicked: prev.clicked + 1,
  };
  writeStore(store);
}

/** actionFrequency stub — boost types used in last 7 days */
export function lensActionFrequencyBoost(actionType: LensActionType): number {
  const entry = readStore()[actionType];
  if (!entry?.clicked) {
    return 0.5;
  }
  return Math.min(1, 0.5 + entry.clicked * 0.08);
}
