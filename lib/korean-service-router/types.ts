export type ServiceCategory =
  | "search"
  | "food"
  | "productivity"
  | "shopping"
  | "health"
  | "education"
  | "finance"
  | "life"
  | "entertainment"
  | "career";

export type ActionType = "ORDER" | "SEARCH" | "BOOK" | "COMPARE" | "LEARN";

export type UrgencyLevel = "LOW" | "MID" | "HIGH";

export type KoreanServiceEntry = {
  id: string;
  name: string;
  category: ServiceCategory;
  homeUrl: string;
  actionUrl: string;
  actionType: ActionType;
  keywords: string[];
};

export type KoreanServiceRoutingResult = {
  intent: string;
  context: string;
  action_type: ActionType;
  reason: string;
  deeplink: string;
  confidence: number;
  fallback: string;
  serviceId: string;
  serviceName: string;
  urgency: UrgencyLevel;
};
