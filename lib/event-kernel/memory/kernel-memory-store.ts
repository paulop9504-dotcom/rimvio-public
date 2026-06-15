import { foldKernelMemory } from "@/lib/event-kernel/memory/fold-kernel-memory";
import type { EventKernelMemoryState } from "@/lib/event-kernel/memory/types";
import { emptyKernelMemoryState } from "@/lib/event-kernel/memory/types";
import type { EventKernelState } from "@/lib/event-kernel/types";

const STORAGE_KEY = "rimvio-kernel-memory.v1";
const DEFAULT_SCOPE = "default";

let memoryByScope = new Map<string, EventKernelMemoryState>();

function readScope(scopeId: string): EventKernelMemoryState | null {
  if (typeof window === "undefined") {
    return memoryByScope.get(scopeId) ?? null;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Record<string, EventKernelMemoryState>;
    return parsed[scopeId] ?? null;
  } catch {
    return memoryByScope.get(scopeId) ?? null;
  }
}

function writeScope(scopeId: string, state: EventKernelMemoryState | null) {
  if (typeof window === "undefined") {
    if (state) {
      memoryByScope.set(scopeId, state);
    } else {
      memoryByScope.delete(scopeId);
    }
    return;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, EventKernelMemoryState>) : {};
    if (state) {
      parsed[scopeId] = state;
    } else {
      delete parsed[scopeId];
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    if (state) {
      memoryByScope.set(scopeId, state);
    } else {
      memoryByScope.delete(scopeId);
    }
  }
}

export function resetKernelMemoryStoreForTests(scopeId = DEFAULT_SCOPE) {
  memoryByScope = new Map();
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY);
  }
  writeScope(scopeId, null);
}

export function getKernelMemory(scopeId = DEFAULT_SCOPE): EventKernelMemoryState {
  return readScope(scopeId) ?? emptyKernelMemoryState();
}

export function commitKernelMemory(state: EventKernelMemoryState, scopeId = DEFAULT_SCOPE) {
  writeScope(scopeId, state);
  return state;
}

export function foldAndCommitKernelMemory(input: {
  kernel: EventKernelState;
  userMessage: string;
  scopeId?: string;
  previous?: EventKernelMemoryState | null;
}) {
  const scopeId = input.scopeId ?? DEFAULT_SCOPE;
  const previous = input.previous ?? readScope(scopeId);
  const folded = foldKernelMemory({
    kernel: input.kernel,
    userMessage: input.userMessage,
    previous,
  });
  commitKernelMemory(folded.state, scopeId);
  return folded;
}
