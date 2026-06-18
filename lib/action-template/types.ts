/** Action OS Standard Template — Base (fixed) + Slots (AI-filled). */
export type ActionTemplateCategory = "Apex" | "Haven" | "Nexus" | "Sentinel" | "Generic";

export type BaseActionType =
  | "CHECKLIST"
  | "LINK"
  | "SAVE"
  | "CALL"
  | "NAVIGATE"
  | "ZOOM"
  | "INFO"
  | "CHECK";

export type TemplateBaseAction = {
  type: BaseActionType;
  label: string;
  id: string;
  url?: string | null;
  prompt?: string | null;
};

export type TemplateBaseItem = {
  item: string;
  mandatory: boolean;
};

export type AiModificationPolicy = {
  allow_addition: boolean;
  mandatory_lock: boolean;
  context_prompt: string;
};

export type ActionTemplateSchema = {
  template_id: string;
  category: ActionTemplateCategory;
  name: string;
  context_trigger: string;
  /** Regex or keyword blob matched against user message */
  context_key: string;
  base_actions: TemplateBaseAction[];
  base_items: TemplateBaseItem[];
  ai_modification_policy: AiModificationPolicy;
  /** Optional parent templates for inheritance merge */
  inherits_from?: string[];
};

/** LLM merge output — extends base with AI additions. */
export type MergedTemplateWire = {
  template_id: string;
  name: string;
  added_items: Array<{ item: string; reason?: string }>;
  added_actions: Array<{ type: BaseActionType; label: string; id: string; reason?: string }>;
  removed_item_ids?: string[];
  thought?: string;
};

/** User-specific instantiated template (saved after merge). */
export type TemplateInstance = {
  instance_id: string;
  source_template_ids: string[];
  name: string;
  category: ActionTemplateCategory;
  user_context: string;
  actions: TemplateBaseAction[];
  items: Array<TemplateBaseItem & { id: string; checked: boolean }>;
  createdAt: string;
  updatedAt: string;
};

export type TemplateMergeResult = {
  instance: TemplateInstance;
  merged_wire: MergedTemplateWire;
  strategy: "RULE_MERGE" | "LLM_MERGE";
};
