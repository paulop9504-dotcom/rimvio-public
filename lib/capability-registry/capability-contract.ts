export const CAPABILITY_CONTRACT_VERSION = 1 as const;

/** Initial catalog — stable ids; providers may change. */
export const INITIAL_CAPABILITY_IDS = [
  "NAVIGATE",
  "CALL",
  "MESSAGE",
  "ALARM",
  "EMAIL",
  "CALENDAR",
  "PARKING",
  "TAXI",
  "SEARCH",
  "DOCUMENT",
  "SHEET",
  "LINK",
  "MAP",
  "BOOK_FLIGHT",
  "BOOK_HOTEL",
  "CHECK_IN",
  "CONFIRM_PLACE",
  "CLARIFY_GOAL",
  "OPEN_EVENT",
  "DISMISS_SURFACE",
] as const;

export type CapabilityId = (typeof INITIAL_CAPABILITY_IDS)[number];

export type CapabilityCategory =
  | "mobility"
  | "communication"
  | "productivity"
  | "travel"
  | "finance"
  | "system";

export type CapabilityPlatform = "web" | "ios" | "android" | "desktop";

export type CapabilityAvailability = "available" | "degraded" | "unavailable";

export type CapabilityPriority = "critical" | "high" | "normal" | "low";

export type CapabilityExecutionMode = "deeplink" | "web" | "in_app" | "prompt";

export type CapabilityInputField = {
  key: string;
  label: string;
  required?: boolean;
};

export type CapabilityInputSchema = {
  fields: CapabilityInputField[];
};

export type CapabilityOutputSchema = {
  /** Execution plane result shape hint. */
  kind: "url" | "prompt" | "none";
};

export type CapabilityProviderId =
  | "kakao_navi"
  | "naver_map"
  | "google_maps"
  | "internal_navigation"
  | "tel_default"
  | "sms_default"
  | "kakao_talk"
  | "system_alarm"
  | "mailto_default"
  | "rimvio_calendar"
  | "kakao_parking"
  | "kakao_taxi"
  | "google_search"
  | "google_docs"
  | "google_sheets"
  | "rimvio_link"
  | "rimvio_map"
  | "rimvio_flight"
  | "rimvio_hotel"
  | "rimvio_checkin"
  | "rimvio_prompt";

export type CapabilityProviderDefinition = {
  id: CapabilityProviderId;
  name: string;
  platforms: CapabilityPlatform[];
  priority: number;
};

export type CapabilityDefinition = {
  id: CapabilityId;
  name: string;
  description: string;
  category: CapabilityCategory;
  availability: CapabilityAvailability;
  priority: CapabilityPriority;
  executionMode: CapabilityExecutionMode;
  supportedPlatforms: CapabilityPlatform[];
  inputSchema: CapabilityInputSchema;
  outputSchema: CapabilityOutputSchema;
  providers: CapabilityProviderDefinition[];
};

export type ResolvedCapabilityProvider = {
  capabilityId: CapabilityId;
  providerId: CapabilityProviderId;
  providerName: string;
};

export type CapabilityDispatchRequest = {
  capabilityId: CapabilityId;
  inputs?: Record<string, string>;
  /** Prefer specific provider (tests); production uses resolver. */
  providerId?: CapabilityProviderId;
  platform?: CapabilityPlatform;
  metadata?: Record<string, string>;
};

/** @deprecated Use execution plane — kept for legacy typing only. */
export type CapabilityExecutionPayload = {
  capabilityId: CapabilityId;
  providerId: CapabilityProviderId;
  label: string;
  uri: string;
  fallbackUri?: string;
  mode: CapabilityExecutionMode;
};

export type CapabilityDispatchResult =
  | {
      ok: true;
      executionId: string;
      capabilityId: CapabilityId;
      providerId: CapabilityProviderId;
    }
  | { ok: false; reason: string; capabilityId?: CapabilityId };
