/** §2 — KERNEL final states (decider only). */
export type KernelFinalState =
  | "CONTINUE"
  | "DIRECT_ACTION"
  | "CLARIFY_A"
  | "CLARIFY_B"
  | "ACK"
  | "TERMINAL_ACK";

export type KernelRouteType =
  | "DELEGATE_CONTINUE"
  | "BUSINESS_LOOKUP"
  | "GENERAL_SEARCH"
  | "CLARIFY"
  | "TERMINAL_ACK"
  | "HOLD";

/** Advisory for MEMORY WRITER only — KERNEL must not branch on this field. */
export type MemoryDirective =
  | "WRITE_STM"
  | "WRITE_WM"
  | "WRITE_LTM"
  | "PROMOTE_LTM"
  | "COMPRESS"
  | "IGNORE";

export type KernelIntentDecision = {
  intent: string;
  state: KernelFinalState;
  route: KernelRouteType;
  confidence: number;
  canonical_query?: string;
  notes?: string;
  /** Advisory — executed by Memory Writer after KERNEL decides. */
  memoryDirective?: MemoryDirective;
};

/** §3 — MEMORY hints only; never authoritative. */
export type MemoryHintCandidate = {
  entity: string;
  score: number;
  source: string;
};

export type MemoryHints = {
  candidates: MemoryHintCandidate[];
  scores: number[];
  snippets: string[];
};

/** §6 — execution action derived from KERNEL only. */
export type KernelExecutionAction =
  | "DELEGATE"
  | "SEARCH"
  | "BUSINESS_LOOKUP"
  | "MEAL_RECOMMENDATION"
  | "APPROVE_PENDING_EVENTS"
  | "CLARIFY"
  | "NONE";

/** §6 strict JSON output. */
export type IntentKernelSystemOutput = {
  kernel: {
    intent: string;
    state: KernelFinalState;
    route: KernelRouteType;
    confidence: number;
  };
  memory: {
    candidates: MemoryHintCandidate[];
    scores: number[];
  };
  execution: {
    action: KernelExecutionAction;
  };
};
