import type { PendingCandidateValidation } from "@/lib/event-kernel/review/validate-pending-event-candidate";

export type CausalGraphNode =
  | "UI_Button"
  | "Candidate_State"
  | "Validation_Layer"
  | "Event_SSOT"
  | "Timeline"
  | "Action_Projection"
  | "UI_Layer";

export type CausalGraphEdge = {
  from: CausalGraphNode;
  to: CausalGraphNode;
  label: string;
};

export type CommitDecision =
  | "BLOCKED"
  | "PENDING_CONFIRM"
  | "EXECUTED"
  | "NONE";

export type ValidationTraceResult =
  | "MISSING_DATE"
  | "MISSING_TIME"
  | "AMBIGUOUS_TITLE"
  | "RESOLVED"
  | "PASS"
  | "NONE";

export type ProjectionImpact =
  | "none"
  | "invalidate + recompute"
  | "cache_hit";

export type UiDiff =
  | "show DATE_PICKER"
  | "show CONFIRM_SCREEN"
  | "calendar_update + action_overlay"
  | "none";

export type EventOsStateSnapshot = {
  reviewState: string;
  reviewCandidateCount: number;
  pendingCandidates: Array<{
    id: string;
    title: string;
    date: string | null;
    time: string | null;
  }>;
  scheduledEventCount: number;
  actionProjectionEntryCount: number;
  actionProjectionRevision: number;
};

export type EventOsCausalTrace = {
  inputAction: string;
  triggeredFunction: string;
  triggeredChain: string[];
  stateBefore: EventOsStateSnapshot;
  stateAfter: EventOsStateSnapshot;
  validationResult: ValidationTraceResult;
  commitDecision: CommitDecision;
  eventSSOTChange: boolean;
  projectionImpact: ProjectionImpact;
  uiDiff: UiDiff;
  causalChain: string[];
  relationGraph: {
    nodes: CausalGraphNode[];
    edges: CausalGraphEdge[];
  };
  validations?: PendingCandidateValidation[];
  executionRoute?: string;
  anomalies: string[];
};
