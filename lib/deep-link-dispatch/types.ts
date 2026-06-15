export type DeepLinkIntentCategory =
  | "NAVIGATION"
  | "MEMO"
  | "FINANCE"
  | "COMMUNICATION"
  | "MEDIA_SYSTEM"
  | "MOBILITY"
  | "SMARTHOME"
  | "HEALTH"
  | "SHOPPING";

export type DeepLinkDispatchStatus = "READY_TO_EXECUTE" | "MISSING_PARAMETER";

export type DeepLinkActionWire = {
  intent: DeepLinkIntentCategory;
  target_app: string;
  deep_link: string;
  status: DeepLinkDispatchStatus;
  missing_parameter?: string[];
};

/** Strict JSON shape from Deep-Link Dispatcher prompt */
export type DeepLinkDispatcherOutput = {
  thought: string;
  action: DeepLinkActionWire;
  message: string;
};

export type DeepLinkToolParamSpec = {
  key: string;
  label: string;
};

export type DeepLinkBuildContext = {
  message: string;
  params: Record<string, string>;
};

export type DeepLinkToolDefinition = {
  id: string;
  intent: DeepLinkIntentCategory;
  targetApp: string;
  triggers: RegExp[];
  params: DeepLinkToolParamSpec[];
  build: (ctx: DeepLinkBuildContext) => string | null;
  buildMissingMessage: (missing: string[]) => string;
};
