/** LLM Action Intent wire — no URLs from the model, only IDs + params. */
export type ActionIntentWire = {
  action_id: string;
  params: Record<string, string>;
  fallback_url: string;
  thought?: string;
};

export type ActionIntentDefinition = {
  id: string;
  label: string;
  description: string;
  params: string[];
  fallback_url: string;
  buildUrl: (params: Record<string, string>) => string | null;
};

export type DispatchedActionResult =
  | {
      type: "EXECUTE";
      url: string;
      action_id: string;
      label: string;
      thought?: string;
    }
  | {
      type: "WEB_OPEN";
      url: string;
      action_id: string | "UNKNOWN";
      label: string;
      thought?: string;
    };
