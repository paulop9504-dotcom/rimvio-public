/** §5 strict routing output — no natural language response. */
export type IntentRoutingIntent =
  | "ACK"
  | "CONTINUE"
  | "DIRECT_ACTION"
  | "CLARIFY"
  | "TERMINAL_ACK";

export type IntentRoutingState =
  | "ACK"
  | "CONTINUE"
  | "QUERY"
  | "CLARIFY_A"
  | "CLARIFY_B"
  | "TERMINAL_ACK";

export type IntentRoutingRoute =
  | "DELEGATE_CONTINUE"
  | "BUSINESS_LOOKUP"
  | "GENERAL_SEARCH"
  | "CLARIFY"
  | "TERMINAL_ACK"
  | "HOLD";

export type PreviousTurnIntent =
  | "QUESTION"
  | "PROPOSAL"
  | "ACTION_OFFER"
  | "STATEMENT"
  | "UNKNOWN";

export type IntentRoutingDecision = {
  intent: IntentRoutingIntent;
  state: IntentRoutingState;
  route: IntentRoutingRoute;
  confidence: number;
  notes: string;
  canonical_query?: string;
};
