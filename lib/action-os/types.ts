/** Rimvio Action OS wire types — strict LLM JSON schema. */
export type RegisterActionWire = {
  action: "REGISTER_ACTION";
  trigger_pattern: string;
  action_schema: {
    type: "ACTION_ID" | "DEEP_LINK" | "API" | "UI";
    action_id?: string;
    params?: Record<string, string>;
    uri?: string;
    label: string;
  };
};

export type DockExecutionWire = {
  type: string;
  uri: string;
  action_id?: string;
  params?: Record<string, string>;
};

export type DockActionWire = {
  label: string;
  execution: DockExecutionWire;
  lifecycle?: "WARM" | "ACTIVE" | "ARCHIVED";
  /** Optional ranking explanation for MAIN dock chip. */
  rankingWhy?: string;
};

export type DockUpdateWire = {
  thought?: string;
  strategy: "MANUAL_CORE" | "LEARNED_TEMPLATE" | "DYNAMIC_INFERENCE";
  main_action: DockActionWire;
  shadow_actions: DockActionWire[];
};

export type CustomTriggerRecord = {
  id: string;
  trigger_pattern: string;
  action_schema: RegisterActionWire["action_schema"];
  createdAt: string;
  updatedAt: string;
};

export const REGISTER_ACTION_CONFIRM_MESSAGE = "설정이 완료되었습니다";
