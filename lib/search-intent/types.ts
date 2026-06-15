export type SearchIntent =
  | "general_search"
  | "place_search"
  | "price_inquiry"
  | "navigation"
  | "hours_inquiry"
  | "reservation"
  | "review_inquiry";

export type QueryCandidateKind = "canonical" | "expanded" | "local_intent";

export type SemanticFrame = {
  entities: string[];
  intent: SearchIntent;
  modifiers: string[];
  context: string;
  raw: string;
};

export type QueryCandidate = {
  kind: QueryCandidateKind;
  query: string;
  score: number;
};

export type ResolvedSearchIntent = {
  frame: SemanticFrame;
  candidates: QueryCandidate[];
  primary: QueryCandidate;
  repaired: boolean;
};

export type ResolveSearchIntentInput = {
  text: string;
  /** Prior topic / link title — reinjected when frame is sparse. */
  context?: string;
  /** Compressed intent from a deeplink URL (seed, not final query). */
  deeplinkSeed?: string;
};
