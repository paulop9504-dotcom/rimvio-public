import type { KernelMicroIntentKey } from "@/lib/event-kernel/types";

export type KernelMemoryEvent = {
  id: string;
  at: string;
  /** Compressed meaning — not full raw text after compression. */
  gist: string;
  entities: string[];
  intent_hint: string;
  dominant: KernelMicroIntentKey;
  topic: string | null;
  weight: number;
};

export type KernelMemoryItemKind = "entity" | "intent" | "topic" | "preference";

/** Post-storage lifecycle stage (managed by memory-lifespan-engine only). */
export type MemoryLifecycleStage = "active" | "dormant" | "compressed" | "forgotten";

export type KernelMemoryItem = {
  id: string;
  key: string;
  label: string;
  kind: KernelMemoryItemKind;
  weight: number;
  hitCount: number;
  lastSeenAt: string;
  /** Defaults to active when omitted (backward compatible). */
  lifecycle?: MemoryLifecycleStage;
};

export type KernelActiveLinkRelation = "continue" | "query" | "shift" | "ack" | "close";

export type KernelActiveLink = {
  fromId: string;
  toId: string;
  relation: KernelActiveLinkRelation;
  weight: number;
};

/** Full memory state carried across turns. */
export type EventKernelMemoryState = {
  stm: KernelMemoryEvent[];
  wm: KernelMemoryItem[];
  ltm: KernelMemoryItem[];
  active_links: KernelActiveLink[];
  session_topic: string | null;
  updated_at: string;
};

/** §6 strict output — includes decayed item ids from this fold only. */
export type EventKernelMemoryOutput = {
  stm: KernelMemoryEvent[];
  wm: KernelMemoryItem[];
  ltm: KernelMemoryItem[];
  active_links: KernelActiveLink[];
  decayed_items: string[];
};

export const STM_MAX = 8;
export const STM_MIN = 3;
export const LTM_PROMOTE_HITS = 3;
export const LTM_PROMOTE_WEIGHT = 2.5;
export const WM_DECAY_FACTOR = 0.85;
export const WM_DECAY_FLOOR = 0.15;
export const WM_REINFORCE = 0.35;
export const WM_INITIAL_WEIGHT = 1;

export function emptyKernelMemoryState(now = new Date().toISOString()): EventKernelMemoryState {
  return {
    stm: [],
    wm: [],
    ltm: [],
    active_links: [],
    session_topic: null,
    updated_at: now,
  };
}
