import type { EventCandidateCategory } from "@/lib/events/event-candidate";

export type ActionTelemetryKind = "shown" | "clicked" | "executed" | "dismissed";

export type ActionTier = "MAIN" | "AUX";

export type ActionTelemetryEvent = {
  id: string;
  eventId: string;
  actionId: string;
  label: string;
  tier: ActionTier;
  phase?: string;
  kind: ActionTelemetryKind;
  at: string;
  surface?: string;
  impressionKey?: string;
};

export type ArchivedActionResult =
  | "executed"
  | "clicked"
  | "dismissed"
  | "ignored";

export type ArchivedActionRecord = {
  actionId: string;
  label: string;
  tier: ActionTier;
  phase?: string;
  shownAt?: string;
  clickedAt?: string;
  executedAt?: string;
  dismissedAt?: string;
  result: ArchivedActionResult;
};

export type ArchivedEventSnapshot = {
  eventId: string;
  title: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  status: string;
  sourceRef?: string;
  category: EventCandidateCategory;
};

export type ArchivedExecutionSummary = {
  executedCount: number;
  clickedCount: number;
  dismissedCount: number;
  ignoredCount: number;
  shownCount: number;
};

export type ArchivedBehaviorSnapshot = {
  contextKey: string;
  selectedMainAction: string | null;
  selectedAuxActions: string[];
  ignoredActions: string[];
};

export type LearningSignal = {
  contextKey: string;
  actionKey: string;
  label: string;
  shown: number;
  clicked: number;
  executed: number;
  dismissed: number;
  rates: {
    clickRate: number;
    executeRate: number;
    dismissRate: number;
  };
  scoreDelta: number;
};

export type ArchivedEvent = {
  archiveId: string;
  archivedAt: string;
  event: ArchivedEventSnapshot;
  mainActionHistory: ArchivedActionRecord[];
  auxiliaryActionHistory: ArchivedActionRecord[];
  executionSummary: ArchivedExecutionSummary;
  behaviorSnapshot: ArchivedBehaviorSnapshot;
  learningSignals: LearningSignal[];
};

export type FoldArchivedEventResult = {
  ok: boolean;
  folded: boolean;
  archiveId?: string;
  archivedEvent?: ArchivedEvent;
};
