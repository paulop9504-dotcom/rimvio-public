import type { KernelMemoryEvent } from "@/lib/event-kernel/memory/types";
import { STM_MAX, STM_MIN } from "@/lib/event-kernel/memory/types";
import { normalizeMemoryKey } from "@/lib/event-kernel/memory/normalize-memory-key";

function eventSignature(event: KernelMemoryEvent): string {
  const entities = [...event.entities].sort().map(normalizeMemoryKey).join("|");
  return `${event.dominant}:${entities}:${normalizeMemoryKey(event.intent_hint)}`;
}

function mergeGist(left: string, right: string): string {
  if (left === right) {
    return left;
  }
  if (left.includes(right)) {
    return left;
  }
  if (right.includes(left)) {
    return right;
  }
  return `${left} → ${right}`;
}

/** §5 — compress STM when over max; preserve meaning not raw text. */
export function compressStmEvents(events: KernelMemoryEvent[]): KernelMemoryEvent[] {
  if (events.length <= STM_MAX) {
    return events;
  }

  const merged: KernelMemoryEvent[] = [];
  for (const event of events) {
    const prev = merged[merged.length - 1];
    if (prev && eventSignature(prev) === eventSignature(event)) {
      merged[merged.length - 1] = {
        ...prev,
        gist: mergeGist(prev.gist, event.gist),
        weight: prev.weight + event.weight * 0.5,
        at: event.at,
      };
      continue;
    }
    merged.push(event);
  }

  if (merged.length <= STM_MAX) {
    return merged;
  }

  const tail = merged.slice(-STM_MAX);
  const head = merged.slice(0, merged.length - STM_MAX);
  if (head.length === 0) {
    return tail;
  }

  const compressedHead: KernelMemoryEvent = {
    id: `stm-compressed-${head[0]!.id}`,
    at: head[head.length - 1]!.at,
    gist: head.map((item) => item.gist).join(" · "),
    entities: [...new Set(head.flatMap((item) => item.entities))].slice(0, 5),
    intent_hint: head[head.length - 1]!.intent_hint,
    dominant: head[head.length - 1]!.dominant,
    topic: head[head.length - 1]!.topic,
    weight: head.reduce((sum, item) => sum + item.weight, 0) / head.length,
  };

  const result = [compressedHead, ...tail];
  while (result.length > STM_MAX && result.length > STM_MIN) {
    result.shift();
  }
  return result;
}
