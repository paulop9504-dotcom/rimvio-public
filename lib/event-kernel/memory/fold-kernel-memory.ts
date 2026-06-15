import type { EventKernelState } from "@/lib/event-kernel/types";
import type {
  EventKernelMemoryOutput,
  EventKernelMemoryState,
  KernelActiveLink,
  KernelActiveLinkRelation,
  KernelMemoryEvent,
  KernelMemoryItem,
  KernelMemoryItemKind,
} from "@/lib/event-kernel/memory/types";
import {
  LTM_PROMOTE_HITS,
  LTM_PROMOTE_WEIGHT,
  STM_MIN,
  WM_DECAY_FACTOR,
  WM_DECAY_FLOOR,
  WM_INITIAL_WEIGHT,
  WM_REINFORCE,
  emptyKernelMemoryState,
} from "@/lib/event-kernel/memory/types";
import { compressStmEvents } from "@/lib/event-kernel/memory/compress-stm";
import { memoryKeysMatch, normalizeMemoryKey } from "@/lib/event-kernel/memory/normalize-memory-key";

export type FoldKernelMemoryInput = {
  kernel: EventKernelState;
  userMessage: string;
  previous?: EventKernelMemoryState | null;
  now?: string;
};

function createId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function buildGist(kernel: EventKernelState, userMessage: string): string {
  const entity = kernel.frame.entities[0];
  const hint = kernel.frame.intent_hint;
  if (entity && hint) {
    return `${entity} · ${hint}`;
  }
  if (entity) {
    return entity;
  }
  if (hint) {
    return hint;
  }
  return userMessage.trim().slice(0, 80);
}

function resolveTopic(kernel: EventKernelState, previousTopic: string | null): string | null {
  const dominant = kernel.dominantIntent;
  if (dominant === "CLOSE") {
    return null;
  }
  if (dominant === "SHIFT") {
    return kernel.frame.entities[0] ?? kernel.frame.intent_hint ?? previousTopic;
  }
  if (kernel.frame.entities[0]) {
    return kernel.frame.entities[0];
  }
  if (
    previousTopic &&
    (dominant === "CONTINUE" ||
      dominant === "ACK" ||
      dominant === "QUERY" ||
      dominant === "PASSIVE")
  ) {
    return previousTopic;
  }
  if (kernel.frame.intent_hint) {
    return kernel.frame.intent_hint;
  }
  return previousTopic;
}

function relationFromDominant(dominant: EventKernelState["dominantIntent"]): KernelActiveLinkRelation {
  switch (dominant) {
    case "QUERY":
      return "query";
    case "SHIFT":
      return "shift";
    case "ACK":
      return "ack";
    case "CLOSE":
      return "close";
    default:
      return "continue";
  }
}

function upsertMemoryItem(
  items: KernelMemoryItem[],
  input: { label: string; kind: KernelMemoryItemKind; now: string }
): KernelMemoryItem[] {
  const key = normalizeMemoryKey(input.label);
  if (!key) {
    return items;
  }

  const existingIndex = items.findIndex(
    (item) => item.key === key || memoryKeysMatch(item.label, input.label)
  );

  if (existingIndex >= 0) {
    const existing = items[existingIndex]!;
    const next: KernelMemoryItem = {
      ...existing,
      label: existing.label.length >= input.label.length ? existing.label : input.label,
      weight: existing.weight + WM_REINFORCE,
      hitCount: existing.hitCount + 1,
      lastSeenAt: input.now,
    };
    return items.map((item, index) => (index === existingIndex ? next : item));
  }

  return [
    ...items,
    {
      id: createId("wm"),
      key,
      label: input.label.trim(),
      kind: input.kind,
      weight: WM_INITIAL_WEIGHT,
      hitCount: 1,
      lastSeenAt: input.now,
    },
  ];
}

function decayWorkingMemory(
  items: KernelMemoryItem[],
  touchedKeys: Set<string>
): { wm: KernelMemoryItem[]; decayed: string[] } {
  const decayed: string[] = [];
  const wm = items.flatMap((item) => {
    if (touchedKeys.has(item.key)) {
      return [item];
    }
    const weight = item.weight * WM_DECAY_FACTOR;
    if (weight < WM_DECAY_FLOOR) {
      decayed.push(item.id);
      return [];
    }
    return [{ ...item, weight }];
  });
  return { wm, decayed };
}

function promoteToLtm(wm: KernelMemoryItem[], ltm: KernelMemoryItem[]): KernelMemoryItem[] {
  let nextLtm = [...ltm];
  for (const item of wm) {
    if (item.hitCount < LTM_PROMOTE_HITS && item.weight < LTM_PROMOTE_WEIGHT) {
      continue;
    }
    const existingIndex = nextLtm.findIndex(
      (entry) => entry.key === item.key || memoryKeysMatch(entry.label, item.label)
    );
    if (existingIndex >= 0) {
      const existing = nextLtm[existingIndex]!;
      nextLtm[existingIndex] = {
        ...existing,
        weight: existing.weight + item.weight * 0.5,
        hitCount: existing.hitCount + 1,
        lastSeenAt: item.lastSeenAt,
      };
    } else {
      nextLtm.push({
        ...item,
        id: createId("ltm"),
        weight: Math.max(item.weight, LTM_PROMOTE_WEIGHT),
      });
    }
  }
  return nextLtm;
}

function buildStmEvent(input: {
  kernel: EventKernelState;
  userMessage: string;
  topic: string | null;
  now: string;
}): KernelMemoryEvent {
  return {
    id: createId("stm"),
    at: input.now,
    gist: buildGist(input.kernel, input.userMessage),
    entities: [...input.kernel.frame.entities],
    intent_hint: input.kernel.frame.intent_hint,
    dominant: input.kernel.dominantIntent,
    topic: input.topic,
    weight: 1,
  };
}

function appendActiveLink(
  links: KernelActiveLink[],
  prev: KernelMemoryEvent | undefined,
  next: KernelMemoryEvent,
  relation: KernelActiveLinkRelation
): KernelActiveLink[] {
  if (!prev) {
    return links;
  }
  return [
    ...links.slice(-12),
    {
      fromId: prev.id,
      toId: next.id,
      relation,
      weight: 1,
    },
  ];
}

/**
 * Event Kernel Memory fold — continuity only (§1–§7).
 * Does NOT decide intent or execute actions.
 */
export function foldKernelMemory(input: FoldKernelMemoryInput): {
  state: EventKernelMemoryState;
  output: EventKernelMemoryOutput;
} {
  const now = input.now ?? new Date().toISOString();
  const previous = input.previous ?? emptyKernelMemoryState(now);
  const { kernel, userMessage } = input;

  const sessionTopic = resolveTopic(kernel, previous.session_topic);
  const stmEvent = buildStmEvent({ kernel, userMessage, topic: sessionTopic, now });
  const prevStmEvent = previous.stm[previous.stm.length - 1];

  let stm = compressStmEvents([...previous.stm, stmEvent]);
  let active_links = appendActiveLink(
    previous.active_links,
    prevStmEvent,
    stmEvent,
    relationFromDominant(kernel.dominantIntent)
  );

  const touchedKeys = new Set<string>();
  let wm = [...previous.wm];

  for (const entity of kernel.frame.entities) {
    wm = upsertMemoryItem(wm, { label: entity, kind: "entity", now });
    touchedKeys.add(normalizeMemoryKey(entity));
  }

  if (kernel.frame.intent_hint) {
    wm = upsertMemoryItem(wm, {
      label: kernel.frame.intent_hint,
      kind: "intent",
      now,
    });
    touchedKeys.add(normalizeMemoryKey(kernel.frame.intent_hint));
  }

  if (sessionTopic) {
    wm = upsertMemoryItem(wm, { label: sessionTopic, kind: "topic", now });
    touchedKeys.add(normalizeMemoryKey(sessionTopic));
  }

  if (
    kernel.dominantIntent === "QUERY" &&
    kernel.committedDecision !== "DIRECT_ACTION"
  ) {
    const unresolved = `unresolved:${sessionTopic ?? buildGist(kernel, userMessage)}`;
    wm = upsertMemoryItem(wm, { label: unresolved, kind: "intent", now });
    touchedKeys.add(normalizeMemoryKey(unresolved));
  }

  const decayed = decayWorkingMemory(wm, touchedKeys);
  wm = decayed.wm;

  let ltm = promoteToLtm(wm, [...previous.ltm]);

  if (kernel.dominantIntent === "CLOSE") {
    stm = compressStmEvents(stm.slice(-STM_MIN));
    wm = wm.filter((item) => item.kind !== "intent" || !item.label.startsWith("unresolved:"));
  }

  if (kernel.dominantIntent === "SHIFT") {
    active_links = [
      ...active_links,
      {
        fromId: prevStmEvent?.id ?? stmEvent.id,
        toId: stmEvent.id,
        relation: "shift",
        weight: 1.2,
      },
    ];
  }

  const state: EventKernelMemoryState = {
    stm,
    wm,
    ltm,
    active_links,
    session_topic: sessionTopic,
    updated_at: now,
  };

  const output: EventKernelMemoryOutput = {
    stm,
    wm,
    ltm,
    active_links,
    decayed_items: decayed.decayed,
  };

  return { state, output };
}
