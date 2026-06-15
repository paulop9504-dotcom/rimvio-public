export type ActionStrategyTier =
  | "MANUAL_CORE"
  | "DYNAMIC_INFERENCE"
  | "LEARNED_TEMPLATE";

export type ActionTemplateStatus = "LEARNING" | "PROMOTED" | "ARCHIVED";

export type ActionRegistryAction = {
  type: string;
  label: string;
  prompt: string;
  score?: number;
  priority?: number;
};

export type ActionRegistryEntry = {
  id: string;
  /** Human-readable trigger signature for matching */
  contextKey: string;
  category: "Apex" | "Haven" | "Nexus" | "Sentinel" | "Generic";
  scenario: string;
  template_status: ActionTemplateStatus;
  strategy_source: ActionStrategyTier;
  usage_count: number;
  main_action: ActionRegistryAction | null;
  shadow_actions: ActionRegistryAction[];
  createdAt: string;
  updatedAt: string;
  lastUsedAt: string | null;
};

export type ActionArchitectWire = {
  thought: string;
  strategy_applied: ActionStrategyTier;
  template_id: string | null;
  message: string;
  main_action: { type: string; label: string; priority: number; prompt?: string } | null;
  shadow_actions: Array<{ type: string; label: string; score: number; prompt?: string }>;
};

export type ActionTemplateMatch = {
  tier: ActionStrategyTier;
  template: ActionRegistryEntry;
};
