import type { CognitiveContext } from "@/lib/context-builder/types";
import type { ContextOpportunity, OpportunityKind, SurfaceHint } from "@/lib/cognitive-opportunity/types";
import type { FeedbackState } from "@/lib/cognitive-orchestrator/types";
import type {
  CalendarUiItem,
  DockUiItem,
  NarrationUiItem,
  SurfaceUiState,
  TimelineUiItem,
} from "@/lib/surface-render-contract/types";
import type { VisibilityDecision, VisibilitySurface } from "@/lib/visibility-bridge/types";

export type StabilityGuardInput = {
  context: CognitiveContext | null | undefined;
  opportunities: ContextOpportunity[] | null | undefined;
  visibilityDecisions: VisibilityDecision[] | null | undefined;
  uiState: SurfaceUiState | null | undefined;
  feedbackState?: FeedbackState | null;
  executionLog?: string[] | null;
};

export type StabilityGuardResult = {
  isValid: boolean;
  sanitizedContext: CognitiveContext;
  sanitizedOpportunities: ContextOpportunity[];
  sanitizedDecisions: VisibilityDecision[];
  sanitizedUIState: SurfaceUiState;
  warnings: string[];
  criticalIssues: string[];
  systemHealthScore: number;
};

export const DENSITY_LIMITS: Record<VisibilitySurface, number> = {
  CALENDAR: 5,
  DOCK: 10,
  TIMELINE: 7,
  NARRATION: 5,
};

export const SCATTERED_DOCK_CAP = 5;
export const SCATTERED_HIGH_VOLUME_THRESHOLD = 10;
export const CALENDAR_URGENCY_FLOOR = 0.4;

export const VALID_SURFACES: readonly VisibilitySurface[] = [
  "CALENDAR",
  "DOCK",
  "TIMELINE",
  "NARRATION",
];

export const VALID_OPPORTUNITY_KINDS: readonly OpportunityKind[] = [
  "ACTION",
  "REMINDER",
  "SUGGESTION",
  "REENGAGEMENT",
];

export const VALID_ATTENTION_STATES: readonly CognitiveContext["attentionState"][] = [
  "FOCUSED",
  "SCATTERED",
  "IDLE",
];

export type ScoredUiItem =
  | { surface: "CALENDAR"; item: CalendarUiItem; score: number }
  | { surface: "DOCK"; item: DockUiItem; score: number }
  | { surface: "TIMELINE"; item: TimelineUiItem; score: number }
  | { surface: "NARRATION"; item: NarrationUiItem; score: number };
