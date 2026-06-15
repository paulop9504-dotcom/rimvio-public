import {
  ENTROPY_DIRECT_THRESHOLD,
  ENTROPY_OPTIONS_THRESHOLD,
  type EventKernelState,
} from "@/lib/event-kernel/types";
import type { EventKernelMemoryState } from "@/lib/event-kernel/memory/types";
import { memoryKeysMatch } from "@/lib/event-kernel/memory/normalize-memory-key";
import type {
  EventKernelSearchPlan,
  KernelMemoryBias,
  KernelMultiHopStep,
  KernelSearchType,
} from "@/lib/event-kernel/search-planner/types";
import {
  SEARCH_ENTROPY_EXPANDED,
  SEARCH_ENTROPY_SIMPLE,
} from "@/lib/event-kernel/search-planner/types";
import { expandQueryCandidates, uniqueJoin } from "@/lib/search-intent/expand-query-candidates";
import type { SearchIntent, SemanticFrame } from "@/lib/search-intent/types";

export type PlanKernelSearchInput = {
  kernel: EventKernelState;
  memory?: EventKernelMemoryState | null;
  userMessage: string;
};

function asSearchIntent(hint: string): SearchIntent {
  const allowed: SearchIntent[] = [
    "general_search",
    "place_search",
    "price_inquiry",
    "navigation",
    "hours_inquiry",
    "reservation",
    "review_inquiry",
  ];
  if (allowed.includes(hint as SearchIntent)) {
    return hint as SearchIntent;
  }
  return "general_search";
}

function memoryEntities(memory: EventKernelMemoryState | null | undefined): string[] {
  if (!memory) {
    return [];
  }

  const ranked = [...memory.wm, ...memory.ltm]
    .filter((item) => item.kind === "entity" || item.kind === "topic")
    .sort((a, b) => b.weight - a.weight);

  const labels: string[] = [];
  for (const item of ranked) {
    if (labels.some((label) => memoryKeysMatch(label, item.label))) {
      continue;
    }
    labels.push(item.label);
  }

  if (memory.session_topic) {
    labels.unshift(memory.session_topic);
  }

  return labels.slice(0, 5);
}

function buildMemoryBias(
  memory: EventKernelMemoryState | null | undefined
): KernelMemoryBias[] {
  if (!memory) {
    return [];
  }

  const bias: KernelMemoryBias[] = [];

  if (memory.session_topic) {
    bias.push({
      source: "session_topic",
      label: memory.session_topic,
      weight: 1,
    });
  }

  for (const item of memory.wm.slice(0, 4)) {
    bias.push({
      source: "wm",
      label: item.label,
      weight: item.weight,
    });
  }

  for (const item of memory.ltm.slice(0, 3)) {
    bias.push({
      source: "ltm",
      label: item.label,
      weight: item.weight,
    });
  }

  const latestStm = memory.stm[memory.stm.length - 1];
  if (latestStm?.topic) {
    bias.push({
      source: "stm",
      label: latestStm.topic,
      weight: latestStm.weight,
    });
  }

  const seen = new Set<string>();
  return bias.filter((entry) => {
    const key = entry.label.toLowerCase();
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function semanticFrameFromKernel(
  kernel: EventKernelState,
  memory: EventKernelMemoryState | null | undefined,
  userMessage: string
): SemanticFrame {
  const memoryEntityList = memoryEntities(memory);
  const entities =
    kernel.frame.entities.length > 0
      ? [...kernel.frame.entities]
      : memoryEntityList.slice(0, 2);

  return {
    entities,
    intent: asSearchIntent(kernel.frame.intent_hint),
    modifiers: [...kernel.frame.modifiers],
    context: memory?.session_topic ?? kernel.frame.context ?? "",
    raw: kernel.frame.raw || userMessage.trim(),
  };
}

function resolveSearchType(entropy: number, entityCount: number): KernelSearchType {
  if (entropy >= SEARCH_ENTROPY_EXPANDED || entityCount === 0) {
    return "MULTI_HOP";
  }
  if (entropy >= SEARCH_ENTROPY_SIMPLE) {
    return "EXPANDED";
  }
  return "SIMPLE";
}

function buildFallbackQueries(input: {
  frame: SemanticFrame;
  canonical: string;
  memory: EventKernelMemoryState | null | undefined;
}): string[] {
  const fallbacks: string[] = [];
  const topic = input.memory?.session_topic;

  if (topic && !input.canonical.toLowerCase().includes(topic.toLowerCase())) {
    fallbacks.push(uniqueJoin([topic, input.canonical]));
  }

  if (input.frame.context && input.frame.context !== topic) {
    fallbacks.push(uniqueJoin([input.frame.context, input.canonical]));
  }

  if (input.frame.raw && input.frame.raw !== input.canonical) {
    fallbacks.push(input.frame.raw.trim());
  }

  const seen = new Set<string>();
  return fallbacks.filter((query) => {
    const key = query.toLowerCase();
    if (!query.trim() || seen.has(key) || key === input.canonical.toLowerCase()) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function buildMultiHopSteps(input: {
  frame: SemanticFrame;
  canonical: string;
  expanded: string[];
  memoryBias: KernelMemoryBias[];
}): KernelMultiHopStep[] {
  const entity =
    input.frame.entities[0] ??
    input.memoryBias.find((bias) => bias.source !== "stm")?.label ??
    input.frame.context;

  const steps: KernelMultiHopStep[] = [];

  if (entity) {
    steps.push({
      step: 1,
      goal: "define entity",
      query: entity,
    });
  }

  steps.push({
    step: steps.length + 1,
    goal: "gather context",
    query: input.expanded[0] ?? input.canonical,
  });

  if (input.frame.modifiers.length > 0) {
    steps.push({
      step: steps.length + 1,
      goal: "refine condition",
      query: uniqueJoin([entity ?? "", ...input.frame.modifiers.slice(0, 2)]),
    });
  }

  steps.push({
    step: steps.length + 1,
    goal: "finalize answer source",
    query: input.canonical,
  });

  return steps;
}

function buildNotes(input: {
  searchType: KernelSearchType;
  entropy: number;
  kernel: EventKernelState;
}): string {
  if (input.searchType === "MULTI_HOP") {
    if (input.kernel.committedDecision === "CLARIFY") {
      return "High entropy — multi-hop plan with clarification fallback.";
    }
    return "High entropy — use multi-hop chain before single-shot retrieval.";
  }
  if (input.searchType === "EXPANDED") {
    return "Medium entropy — try expanded variants in rank order.";
  }
  if (input.entropy < ENTROPY_DIRECT_THRESHOLD) {
    return "Low entropy — single canonical query should succeed.";
  }
  return "Structured search plan ready.";
}

/**
 * Event Kernel Search Planner — design only (§1–§9).
 * Does NOT execute search.
 */
export function planKernelSearch(input: PlanKernelSearchInput): EventKernelSearchPlan {
  const { kernel, memory, userMessage } = input;
  const frame = semanticFrameFromKernel(kernel, memory, userMessage);
  const candidates = expandQueryCandidates(frame);

  const canonical =
    candidates.find((candidate) => candidate.kind === "canonical")?.query ??
    (uniqueJoin([...frame.entities, ...frame.modifiers.slice(0, 1)]) || userMessage.trim());

  const expanded = candidates
    .filter((candidate) => candidate.kind !== "canonical")
    .map((candidate) => candidate.query)
    .filter((query) => query && query.toLowerCase() !== canonical.toLowerCase());

  const memoryBias = buildMemoryBias(memory);
  const fallback_queries = buildFallbackQueries({ frame, canonical, memory });

  const search_type = resolveSearchType(kernel.entropy, frame.entities.length);

  const expanded_queries =
    search_type === "SIMPLE"
      ? expanded.slice(0, 1)
      : search_type === "EXPANDED"
        ? expanded.slice(0, 3)
        : expanded.slice(0, 2);

  const multi_hop_steps =
    search_type === "MULTI_HOP"
      ? buildMultiHopSteps({ frame, canonical, expanded, memoryBias })
      : [];

  return {
    search_type,
    canonical_query: canonical,
    expanded_queries,
    fallback_queries,
    multi_hop_steps,
    memory_bias: memoryBias,
    notes: buildNotes({ searchType: search_type, entropy: kernel.entropy, kernel }),
  };
}

/** True when kernel execution layer would delegate to search pipeline. */
export function kernelShouldPlanSearch(kernel: EventKernelState): boolean {
  if (kernel.dominantIntent !== "QUERY") {
    return false;
  }
  if (kernel.committedDecision === "CLARIFY" || kernel.committedDecision === "OPTIONS") {
    return kernel.entropy >= ENTROPY_OPTIONS_THRESHOLD;
  }
  return true;
}
