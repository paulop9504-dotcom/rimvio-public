import type { LearningSignal } from "@/lib/archive/types";

export type LearningRollupEntry = LearningSignal & {
  updatedAt: string;
};

const STORAGE_KEY = "rimvio.learning-rollup.v1";

let memoryStore: LearningRollupEntry[] = [];

function rollupKey(contextKey: string, actionKey: string): string {
  return `${contextKey}::${actionKey}`;
}

function readStore(): LearningRollupEntry[] {
  if (typeof window === "undefined") {
    return [...memoryStore];
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as LearningRollupEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStore(entries: LearningRollupEntry[]) {
  if (typeof window === "undefined") {
    memoryStore = entries;
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function resetLearningRollupForTests(entries: LearningRollupEntry[] = []) {
  memoryStore = entries;
  if (typeof window !== "undefined") {
    if (entries.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }
}

export function listLearningRollup(): LearningRollupEntry[] {
  return readStore();
}

export function findLearningRollupEntry(
  contextKey: string,
  actionKey: string,
): LearningRollupEntry | null {
  const key = rollupKey(contextKey, actionKey);
  return readStore().find((entry) => rollupKey(entry.contextKey, entry.actionKey) === key) ?? null;
}

function clampRate(value: number): number {
  return Math.max(0, Math.min(1, Math.round(value * 1000) / 1000));
}

function scoreDeltaFromRates(rates: LearningSignal["rates"]): number {
  return clampRate(rates.executeRate * 0.6 + rates.clickRate * 0.25 - rates.dismissRate * 0.5);
}

export function applyLearningSignals(signals: readonly LearningSignal[]): LearningRollupEntry[] {
  const map = new Map<string, LearningRollupEntry>(
    readStore().map((entry) => [rollupKey(entry.contextKey, entry.actionKey), entry]),
  );
  const now = new Date().toISOString();

  for (const signal of signals) {
    const key = rollupKey(signal.contextKey, signal.actionKey);
    const existing = map.get(key);
    const shown = (existing?.shown ?? 0) + signal.shown;
    const clicked = (existing?.clicked ?? 0) + signal.clicked;
    const executed = (existing?.executed ?? 0) + signal.executed;
    const dismissed = (existing?.dismissed ?? 0) + signal.dismissed;
    const rates = {
      clickRate: shown > 0 ? clampRate(clicked / shown) : 0,
      executeRate: shown > 0 ? clampRate(executed / shown) : 0,
      dismissRate: shown > 0 ? clampRate(dismissed / shown) : 0,
    };
    map.set(key, {
      contextKey: signal.contextKey,
      actionKey: signal.actionKey,
      label: signal.label,
      shown,
      clicked,
      executed,
      dismissed,
      rates,
      scoreDelta: scoreDeltaFromRates(rates),
      updatedAt: now,
    });
  }

  const next = [...map.values()];
  writeStore(next);
  return next;
}

/** Replace rollup rows from aggregated telemetry (fold paths — no double-count). */
export function applyLearningSignalsAbsolute(
  signals: readonly LearningSignal[],
): LearningRollupEntry[] {
  const map = new Map<string, LearningRollupEntry>(
    readStore().map((entry) => [rollupKey(entry.contextKey, entry.actionKey), entry]),
  );
  const now = new Date().toISOString();

  for (const signal of signals) {
    const key = rollupKey(signal.contextKey, signal.actionKey);
    const rates = {
      clickRate: signal.shown > 0 ? clampRate(signal.clicked / signal.shown) : 0,
      executeRate: signal.shown > 0 ? clampRate(signal.executed / signal.shown) : 0,
      dismissRate: signal.shown > 0 ? clampRate(signal.dismissed / signal.shown) : 0,
    };
    map.set(key, {
      contextKey: signal.contextKey,
      actionKey: signal.actionKey,
      label: signal.label,
      shown: signal.shown,
      clicked: signal.clicked,
      executed: signal.executed,
      dismissed: signal.dismissed,
      rates,
      scoreDelta: scoreDeltaFromRates(rates),
      updatedAt: now,
    });
  }

  const next = [...map.values()];
  writeStore(next);
  return next;
}
