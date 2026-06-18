import type { ConfidenceBand } from "@/lib/screenshot/transition-gate";
import type { SignalEntry } from "@/lib/screenshot/signal-ledger";
import type { ActionFamily } from "@/lib/personalization/types";
import { INTENT_KERNEL_VERSION } from "@/lib/intent/kernel-version";

export type KernelCategory =
  | "commerce"
  | "place"
  | "media"
  | "productivity"
  | "unknown";

export type TrajectoryCluster =
  | "tech"
  | "fashion"
  | "food"
  | "travel"
  | "productivity"
  | "media"
  | "finance"
  | "unknown";

export type InteractionMode =
  | "focused_research"
  | "comparison"
  | "passive_browse"
  | "quick_capture"
  | "uncertain";

export type CrossLinkPattern = "comparison" | "workflow" | "repeat" | "none";

/** LLM refine contract — only these fields may come from the model. */
export type LlmRefineResult = {
  kind?: "place" | "product" | "unknown";
  query?: string;
};

export type SaveTrajectoryEntry = {
  timestamp: string;
  category: string;
  title: string;
  domain: string | null;
  query?: string | null;
  source_type?: string | null;
  session_id?: string | null;
};

export type IntentKernelResult = {
  v: typeof INTENT_KERNEL_VERSION;
  shadow_intent: {
    category: KernelCategory;
    query: string;
    confidence: number;
  };
  state: {
    interaction_mode: InteractionMode;
    trajectory: {
      dominant_cluster: TrajectoryCluster;
      strength: number;
    };
    context_signals: string[];
    cross_link: {
      related_count: number;
      pattern: CrossLinkPattern;
    };
  };
  policy: {
    band: ConfidenceBand;
    run_llm: boolean;
    needs_confirm: boolean;
    primary_action_family: ActionFamily;
  };
  signals: SignalEntry[];
  llm: {
    invoked: boolean;
    source: "llm" | "skipped";
  };
};

export type BehaviorContext = {
  hour?: number;
  saveHistory?: SaveTrajectoryEntry[];
  current?: {
    category?: string | null;
    domain?: string | null;
    title?: string | null;
    query?: string | null;
  };
};
