/** Surface-layer input state — does not replace KernelCommitDecision. */
export type EntityInputState = "ENTITY_ONLY" | "NOT_ENTITY_ONLY";

export type EntityType =
  | "COMPANY"
  | "BRAND"
  | "RESTAURANT"
  | "PLACE"
  | "PRODUCT"
  | "PERSON"
  | "SOFTWARE"
  | "EVENT"
  | "UNKNOWN";

export type ActionBucket =
  | "INFO"
  | "PRICE"
  | "LOCATION"
  | "HOURS"
  | "NEWS"
  | "PRODUCTS"
  | "CONTACT"
  | "SUPPORT"
  | "RESERVATION"
  | "CAREERS";

export type EntityTypeGuess = {
  entity: string;
  entityType: EntityType;
  confidence: number;
};

export type EntityActionSuggestion = {
  id: string;
  bucket: ActionBucket;
  label: string;
  /** Chip send-text only — surface does not execute. */
  prompt: string;
};

export type EntityActionSurfaceWire = {
  state: "ENTITY_ONLY";
  entity: string;
  entityType: EntityType;
  confidence: number;
  lead: string;
  suggestions: EntityActionSuggestion[];
};

export type EntityOnlyDetection = {
  state: "ENTITY_ONLY";
  entity: string;
};
