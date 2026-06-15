export type KernelSearchType = "SIMPLE" | "EXPANDED" | "MULTI_HOP";

export type KernelMultiHopStep = {
  step: number;
  goal: string;
  query: string;
};

export type KernelMemoryBias = {
  source: "stm" | "wm" | "ltm" | "session_topic";
  label: string;
  weight: number;
};

/** §8 strict output — planning only, no execution. */
export type EventKernelSearchPlan = {
  search_type: KernelSearchType;
  canonical_query: string;
  expanded_queries: string[];
  fallback_queries: string[];
  multi_hop_steps: KernelMultiHopStep[];
  memory_bias: KernelMemoryBias[];
  notes: string;
};

export const SEARCH_ENTROPY_SIMPLE = 0.3;
export const SEARCH_ENTROPY_EXPANDED = 0.7;
