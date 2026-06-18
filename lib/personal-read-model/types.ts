/** AI/orchestrator/recall — one read frame. Never persisted as SSOT. */
export type PersonalReadPacket = {
  meta: PersonalReadMeta;
  fact: PersonalReadFactSlice;
  experience: PersonalReadExperienceSlice;
  meaning: PersonalReadMeaningSlice;
  recall: PersonalReadRecallSlice;
  action: PersonalReadActionSlice;
  gates: PersonalReadGateSlice;
};

/** Alias for external design docs. */
export type ContextPacket = PersonalReadPacket;

export type PersonalReadScope = "client" | "server";

export type PersonalReadMeta = {
  assembledAt: string;
  scope: PersonalReadScope;
  dateKey: string;
  userId: string | null;
  scopeAi: "guardian" | "explorer";
  activeContextId: string | null;
  activeContextTitle: string | null;
  location: {
    lat: number | null;
    lng: number | null;
    label: string | null;
    spatialMode: "unknown" | "nearby_query" | "here_query";
  } | null;
  activeHubKinds: string[];
  trustLevel: 1 | 2 | 3;
};

export type PersonalReadFactSlice = {
  recentEventIds: string[];
  scheduleDateKey: string;
  scheduleTaskCount: number;
  activeLinkIds: string[];
  linkSummaries: Array<{
    id: string;
    domain: string;
    category: string;
    title: string;
  }>;
};

export type PersonalReadExperienceSlice = {
  focus: {
    eventId: string | null;
    title: string | null;
    place: string | null;
    category: string | null;
    visibility: "private" | "external" | null;
  };
  spatial: {
    pinIds: string[];
    tripLegId: string | null;
    departureHubIata: string | null;
  };
  narrationHeadline: string | null;
  hubLinks: Array<{
    kind: string;
    label: string;
    actionUrl: string | null;
    flightProvider: string | null;
  }>;
};

export type MeaningProvenance = "behavior" | "rollup" | "relationship_rule";

export type PersonalReadMeaningSlice = {
  topEdges: Array<{
    edgeId: string;
    meaningLabel: string;
    totalScore: number;
    eventIds: readonly string[];
    provenance: MeaningProvenance;
  }>;
  relationshipLines: Array<{
    peerLabel: string;
    line: string;
    confidence: number;
    frame: string | null;
  }>;
  seasonPattern: {
    key: string;
    label: string;
    confidence: number;
  } | null;
  rollupAffinities: Array<{
    contextKey: string;
    actionKey: string;
    weight: number;
    shown: number;
    executed: number;
  }>;
};

export type RecallTriggerKind =
  | "calendar_horizon"
  | "travel_d_minus"
  | "gap_since_visit"
  | "relationship_nudge"
  | "opportunity_rank";

export type PersonalReadRecallSlice = {
  eligibleTriggers: Array<{
    kind: RecallTriggerKind;
    eventId: string;
    urgency: number;
    reasonCode: string;
  }>;
  horizonInsights: Array<{
    kind: string;
    headline: string;
    severity: "medium" | "high";
  }>;
};

export type PersonalReadActionSlice = {
  registryEntries: Array<{
    id: string;
    contextKey: string;
    category: string;
    scenario: string;
    mainActionType: string | null;
    slotNames: string[];
    templateStatus: string;
  }>;
  rankedMainCandidates: Array<{
    actionKey: string;
    label: string;
    score: number;
    contextKey: string;
    source: "rollup" | "registry" | "link_enricher";
  }>;
  hubServiceIds: string[];
};

export type PersonalReadGateSlice = {
  minConfidenceForMain: number;
  disclosureTier: "hidden" | "soft" | "full";
  blockedActionTypes: string[];
  urgencyBypass: boolean;
  forbidLifeRewrite: boolean;
  forbidRecommendationHero: boolean;
};
