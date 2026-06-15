import type { CognitiveContext } from "@/lib/context-builder/types";
import type { ContextOpportunity, OpportunityKind, SurfaceHint } from "@/lib/cognitive-opportunity/types";
import {
  CALENDAR_URGENCY_FLOOR,
  DENSITY_LIMITS,
  SCATTERED_DOCK_CAP,
  SCATTERED_HIGH_VOLUME_THRESHOLD,
  VALID_ATTENTION_STATES,
  VALID_OPPORTUNITY_KINDS,
  VALID_SURFACES,
  type ScoredUiItem,
  type StabilityGuardInput,
  type StabilityGuardResult,
} from "@/lib/cognitive-stability-guard/types";
import type {
  CalendarUiItem,
  DockUiItem,
  NarrationUiItem,
  SurfaceUiState,
  TimelineUiItem,
} from "@/lib/surface-render-contract/types";
import type { VisibilityDecision, VisibilitySurface } from "@/lib/visibility-bridge/types";

const ACTIONABLE_TYPES = new Set<OpportunityKind>(["ACTION", "REMINDER"]);
const NARRATION_ACTION_PATTERN = /\b(action|submit|approve|complete|remind)\b/i;

function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  if (value <= 0) {
    return 0;
  }
  if (value >= 1) {
    return 1;
  }
  return value;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function isValidSurface(value: unknown): value is VisibilitySurface {
  return typeof value === "string" && VALID_SURFACES.includes(value as VisibilitySurface);
}

function isValidOpportunityKind(value: unknown): value is OpportunityKind {
  return typeof value === "string" && VALID_OPPORTUNITY_KINDS.includes(value as OpportunityKind);
}

function isValidAttentionState(value: unknown): value is CognitiveContext["attentionState"] {
  return typeof value === "string" && VALID_ATTENTION_STATES.includes(value as CognitiveContext["attentionState"]);
}

function createDefaultContext(): CognitiveContext {
  return {
    now: Date.now(),
    userIntentVector: [],
    activeIntents: [],
    attentionState: "IDLE",
    recentTopSignals: [],
    suppressionMap: {},
  };
}

function createEmptyUiState(): SurfaceUiState {
  return {
    CALENDAR: [],
    DOCK: [],
    TIMELINE: [],
    NARRATION: [],
  };
}

function sanitizeContext(
  context: CognitiveContext | null | undefined,
  warnings: string[],
  criticalIssues: string[]
): CognitiveContext {
  if (context == null || typeof context !== "object") {
    criticalIssues.push("missing_context");
    return createDefaultContext();
  }

  const sanitizedSuppression: Record<string, number> = {};
  const rawSuppression = context.suppressionMap ?? {};
  for (const [key, value] of Object.entries(rawSuppression)) {
    const clamped = clamp01(value);
    if (clamped !== value) {
      warnings.push("score_out_of_bounds_clamped");
    }
    sanitizedSuppression[key] = round2(clamped);
  }

  const attentionState = isValidAttentionState(context.attentionState)
    ? context.attentionState
    : "IDLE";

  if (!isValidAttentionState(context.attentionState)) {
    warnings.push("pipeline_discontinuity_fixed");
  }

  return {
    now: Number.isFinite(context.now) ? context.now : Date.now(),
    userIntentVector: Array.isArray(context.userIntentVector)
      ? context.userIntentVector.map((value) => round2(clamp01(value)))
      : [],
    activeIntents: Array.isArray(context.activeIntents)
      ? [...new Set(context.activeIntents.filter((value) => typeof value === "string"))]
      : [],
    attentionState,
    recentTopSignals: Array.isArray(context.recentTopSignals)
      ? context.recentTopSignals.filter((value) => typeof value === "string")
      : [],
    suppressionMap: sanitizedSuppression,
  };
}

function sanitizeOpportunity(
  opportunity: ContextOpportunity,
  warnings: string[]
): ContextOpportunity | null {
  if (!opportunity?.id || typeof opportunity.id !== "string") {
    warnings.push("opportunity_orphan_detected");
    return null;
  }

  const type = isValidOpportunityKind(opportunity.type) ? opportunity.type : "SUGGESTION";
  if (!isValidOpportunityKind(opportunity.type)) {
    warnings.push("pipeline_discontinuity_fixed");
  }

  const recommendedSurfaceHint = isValidSurface(opportunity.recommendedSurfaceHint)
    ? opportunity.recommendedSurfaceHint
    : "DOCK";

  const scoreFields: Array<keyof Pick<
    ContextOpportunity,
    "relevanceScore" | "urgencyScore" | "intentAlignment" | "attentionFit" | "finalScore"
  >> = ["relevanceScore", "urgencyScore", "intentAlignment", "attentionFit", "finalScore"];

  const sanitizedScores: Partial<ContextOpportunity> = {};
  for (const field of scoreFields) {
    const raw = opportunity[field];
    const clamped = round2(clamp01(raw));
    if (clamped !== raw) {
      warnings.push("score_out_of_bounds_clamped");
    }
    sanitizedScores[field] = clamped;
  }

  return {
    id: opportunity.id,
    type,
    sourceEventIds: Array.isArray(opportunity.sourceEventIds)
      ? opportunity.sourceEventIds.filter((value) => typeof value === "string")
      : [],
    relevanceScore: sanitizedScores.relevanceScore ?? 0,
    urgencyScore: sanitizedScores.urgencyScore ?? 0,
    intentAlignment: sanitizedScores.intentAlignment ?? 0,
    attentionFit: sanitizedScores.attentionFit ?? 0,
    finalScore: sanitizedScores.finalScore ?? 0,
    recommendedSurfaceHint: recommendedSurfaceHint as SurfaceHint,
    reasonSignals: Array.isArray(opportunity.reasonSignals)
      ? opportunity.reasonSignals.filter((value) => typeof value === "string")
      : [],
  };
}

function sanitizeOpportunities(
  opportunities: ContextOpportunity[] | null | undefined,
  warnings: string[],
  criticalIssues: string[]
): ContextOpportunity[] {
  if (!Array.isArray(opportunities)) {
    criticalIssues.push("missing_opportunity_linkage");
    return [];
  }

  const seen = new Set<string>();
  const sanitized: ContextOpportunity[] = [];

  for (const opportunity of opportunities) {
    const item = sanitizeOpportunity(opportunity, warnings);
    if (!item || seen.has(item.id)) {
      if (item && seen.has(item.id)) {
        warnings.push("pipeline_discontinuity_fixed");
      }
      continue;
    }
    seen.add(item.id);
    sanitized.push(item);
  }

  sanitized.sort((left, right) => left.id.localeCompare(right.id));
  return sanitized;
}

function sanitizeDecisions(
  decisions: VisibilityDecision[] | null | undefined,
  opportunityIds: ReadonlySet<string>,
  warnings: string[],
  criticalIssues: string[]
): VisibilityDecision[] {
  if (!Array.isArray(decisions)) {
    criticalIssues.push("invalid_decision_mapping");
    return [];
  }

  const sanitized: VisibilityDecision[] = [];
  const seen = new Set<string>();

  for (const decision of decisions) {
    if (!decision?.opportunityId || typeof decision.opportunityId !== "string") {
      criticalIssues.push("invalid_decision_mapping");
      warnings.push("pipeline_discontinuity_fixed");
      continue;
    }

    if (!opportunityIds.has(decision.opportunityId)) {
      warnings.push("opportunity_orphan_detected");
      criticalIssues.push("invalid_decision_mapping");
      continue;
    }

    if (seen.has(decision.opportunityId)) {
      warnings.push("pipeline_discontinuity_fixed");
      continue;
    }
    seen.add(decision.opportunityId);

    const visibilityScore = round2(clamp01(decision.visibilityScore));
    const confidence = round2(clamp01(decision.confidence));
    const suppressionApplied = round2(clamp01(decision.suppressionApplied));

    if (
      visibilityScore !== decision.visibilityScore ||
      confidence !== decision.confidence ||
      suppressionApplied !== decision.suppressionApplied
    ) {
      warnings.push("score_out_of_bounds_clamped");
    }

    const surface = isValidSurface(decision.surface) ? decision.surface : null;
    if (decision.surface != null && !isValidSurface(decision.surface)) {
      warnings.push("pipeline_discontinuity_fixed");
    }

    sanitized.push({
      opportunityId: decision.opportunityId,
      visible: decision.visible === true,
      surface,
      visibilityScore,
      confidence,
      finalSurface:
        typeof decision.finalSurface === "string" ? decision.finalSurface : surface ?? "none",
      tieBreakReason:
        typeof decision.tieBreakReason === "string" ? decision.tieBreakReason : "",
      suppressionApplied,
    });
  }

  sanitized.sort((left, right) => left.opportunityId.localeCompare(right.opportunityId));
  return sanitized;
}

function resolveDecisionSurface(decision: VisibilityDecision): VisibilitySurface | null {
  if (decision.surface && isValidSurface(decision.surface)) {
    return decision.surface;
  }
  const upper = decision.finalSurface?.toUpperCase();
  return isValidSurface(upper) ? upper : null;
}

function buildDecisionLookup(decisions: readonly VisibilityDecision[]): Map<string, VisibilityDecision> {
  const lookup = new Map<string, VisibilityDecision>();
  for (const decision of decisions) {
    lookup.set(decision.opportunityId, decision);
  }
  return lookup;
}

function buildOpportunityLookup(
  opportunities: readonly ContextOpportunity[]
): Map<string, ContextOpportunity> {
  const lookup = new Map<string, ContextOpportunity>();
  for (const opportunity of opportunities) {
    lookup.set(opportunity.id, opportunity);
  }
  return lookup;
}

function calendarIsTimeRelevant(item: CalendarUiItem): boolean {
  return item.timestamp > 0 || item.urgency >= CALENDAR_URGENCY_FLOOR;
}

function dockIsNonCritical(opportunity: ContextOpportunity | undefined): boolean {
  if (!opportunity) {
    return true;
  }
  return !ACTIONABLE_TYPES.has(opportunity.type) || opportunity.urgencyScore < 0.65;
}

function narrationIsInterpretive(item: NarrationUiItem, opportunity: ContextOpportunity | undefined): boolean {
  if (opportunity && ACTIONABLE_TYPES.has(opportunity.type)) {
    return false;
  }
  return !NARRATION_ACTION_PATTERN.test(item.text);
}

function timelineIsSequential(item: TimelineUiItem): TimelineUiItem {
  if (item.start <= item.end) {
    return item;
  }
  return {
    ...item,
    start: item.end,
    end: item.start,
  };
}

function collectScoredUiItems(
  uiState: SurfaceUiState,
  decisions: readonly VisibilityDecision[],
  opportunities: readonly ContextOpportunity[],
  warnings: string[]
): ScoredUiItem[] {
  const decisionLookup = buildDecisionLookup(decisions);
  const opportunityLookup = buildOpportunityLookup(opportunities);
  const allowedBySurface: Record<VisibilitySurface, Set<string>> = {
    CALENDAR: new Set(),
    DOCK: new Set(),
    TIMELINE: new Set(),
    NARRATION: new Set(),
  };

  for (const decision of decisions) {
    if (!decision.visible) {
      continue;
    }
    const surface = resolveDecisionSurface(decision);
    if (!surface) {
      continue;
    }
    allowedBySurface[surface].add(decision.opportunityId);
  }

  const scored: ScoredUiItem[] = [];

  const ingest = (
    surface: VisibilitySurface,
    item: CalendarUiItem | DockUiItem | TimelineUiItem | NarrationUiItem,
    score: number
  ) => {
    if (!allowedBySurface[surface].has(item.id)) {
      warnings.push("pipeline_discontinuity_fixed");
      return;
    }
    if (!opportunityLookup.has(item.id)) {
      warnings.push("opportunity_orphan_detected");
      return;
    }

    if (surface === "CALENDAR") {
      scored.push({ surface, item: item as CalendarUiItem, score });
      return;
    }
    if (surface === "DOCK") {
      scored.push({ surface, item: item as DockUiItem, score });
      return;
    }
    if (surface === "TIMELINE") {
      scored.push({ surface, item: item as TimelineUiItem, score });
      return;
    }
    scored.push({ surface, item: item as NarrationUiItem, score });
  };

  for (const item of uiState.CALENDAR ?? []) {
    ingest("CALENDAR", item, item.urgency);
  }
  for (const item of uiState.DOCK ?? []) {
    ingest("DOCK", item, item.relevance);
  }
  for (const item of uiState.TIMELINE ?? []) {
    const opportunity = opportunityLookup.get(item.id);
    ingest("TIMELINE", item, opportunity?.finalScore ?? 0);
  }
  for (const item of uiState.NARRATION ?? []) {
    const opportunity = opportunityLookup.get(item.id);
    ingest("NARRATION", item, opportunity?.finalScore ?? 0);
  }

  return scored;
}

function applySurfaceConsistency(
  items: ScoredUiItem[],
  opportunityLookup: Map<string, ContextOpportunity>,
  warnings: string[]
): ScoredUiItem[] {
  const adjusted: ScoredUiItem[] = [];

  for (const entry of items) {
    const opportunity = opportunityLookup.get(entry.item.id);

    if (entry.surface === "CALENDAR") {
      const calendarItem = entry.item;
      if (!calendarIsTimeRelevant(calendarItem)) {
        warnings.push("surface_misalignment_detected");
        if (dockIsNonCritical(opportunity)) {
          adjusted.push({
            surface: "DOCK",
            item: {
              id: calendarItem.id,
              type: calendarItem.type,
              title: calendarItem.title,
              relevance: opportunity?.finalScore ?? calendarItem.urgency,
            },
            score: opportunity?.finalScore ?? calendarItem.urgency,
          });
        }
        continue;
      }
      adjusted.push(entry);
      continue;
    }

    if (entry.surface === "DOCK") {
      if (!dockIsNonCritical(opportunity)) {
        warnings.push("surface_misalignment_detected");
        adjusted.push({
          surface: "CALENDAR",
          item: {
            id: entry.item.id,
            type: entry.item.type,
            title: entry.item.title,
            timestamp: 0,
            urgency: opportunity?.urgencyScore ?? entry.score,
          },
          score: opportunity?.urgencyScore ?? entry.score,
        });
        continue;
      }
      adjusted.push(entry);
      continue;
    }

    if (entry.surface === "TIMELINE") {
      const fixed = timelineIsSequential(entry.item);
      if (fixed.start !== entry.item.start || fixed.end !== entry.item.end) {
        warnings.push("pipeline_discontinuity_fixed");
      }
      adjusted.push({ surface: "TIMELINE", item: fixed, score: entry.score });
      continue;
    }

    if (!narrationIsInterpretive(entry.item, opportunity)) {
      warnings.push("surface_misalignment_detected");
      continue;
    }
    adjusted.push(entry);
  }

  return adjusted;
}

function applyAttentionSafety(
  items: ScoredUiItem[],
  attentionState: CognitiveContext["attentionState"],
  warnings: string[]
): ScoredUiItem[] {
  if (attentionState !== "SCATTERED") {
    return items;
  }

  const totalCount = items.length;
  if (totalCount < SCATTERED_HIGH_VOLUME_THRESHOLD) {
    return items;
  }

  warnings.push("ui_density_reduced");

  return items.filter((entry) => {
    if (entry.surface === "DOCK") {
      return true;
    }
    if (entry.surface === "CALENDAR") {
      const calendarItem = entry.item;
      return calendarItem.urgency >= CALENDAR_URGENCY_FLOOR;
    }
    return true;
  });
}

function applyDensityLimits(
  items: ScoredUiItem[],
  attentionState: CognitiveContext["attentionState"],
  warnings: string[]
): SurfaceUiState {
  const buckets: Record<VisibilitySurface, ScoredUiItem[]> = {
    CALENDAR: [],
    DOCK: [],
    TIMELINE: [],
    NARRATION: [],
  };

  for (const entry of items) {
    buckets[entry.surface].push(entry);
  }

  const uiState = createEmptyUiState();

  for (const surface of VALID_SURFACES) {
    let limit = DENSITY_LIMITS[surface];
    if (surface === "DOCK" && attentionState === "SCATTERED") {
      limit = Math.min(limit, SCATTERED_DOCK_CAP);
    }

    const bucket = [...buckets[surface]].sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }
      return left.item.id.localeCompare(right.item.id);
    });

    if (bucket.length > limit) {
      warnings.push("ui_density_reduced");
    }

    const kept = bucket.slice(0, limit);

    if (surface === "CALENDAR") {
      uiState.CALENDAR = kept.map((entry) => entry.item as CalendarUiItem);
      uiState.CALENDAR.sort((left, right) => left.id.localeCompare(right.id));
      continue;
    }
    if (surface === "DOCK") {
      uiState.DOCK = kept.map((entry) => entry.item as DockUiItem);
      uiState.DOCK.sort((left, right) => left.id.localeCompare(right.id));
      continue;
    }
    if (surface === "TIMELINE") {
      uiState.TIMELINE = kept.map((entry) => entry.item as TimelineUiItem);
      uiState.TIMELINE.sort((left, right) => left.id.localeCompare(right.id));
      continue;
    }
    uiState.NARRATION = kept.map((entry) => entry.item as NarrationUiItem);
    uiState.NARRATION.sort((left, right) => left.id.localeCompare(right.id));
  }

  return uiState;
}

function sanitizeUiState(
  uiState: SurfaceUiState | null | undefined,
  decisions: readonly VisibilityDecision[],
  opportunities: readonly ContextOpportunity[],
  attentionState: CognitiveContext["attentionState"],
  warnings: string[]
): SurfaceUiState {
  if (uiState == null || typeof uiState !== "object") {
    warnings.push("pipeline_discontinuity_fixed");
    return createEmptyUiState();
  }

  const normalized: SurfaceUiState = {
    CALENDAR: Array.isArray(uiState.CALENDAR) ? uiState.CALENDAR : [],
    DOCK: Array.isArray(uiState.DOCK) ? uiState.DOCK : [],
    TIMELINE: Array.isArray(uiState.TIMELINE) ? uiState.TIMELINE : [],
    NARRATION: Array.isArray(uiState.NARRATION) ? uiState.NARRATION : [],
  };

  const opportunityLookup = buildOpportunityLookup(opportunities);
  let scored = collectScoredUiItems(normalized, decisions, opportunities, warnings);
  scored = applySurfaceConsistency(scored, opportunityLookup, warnings);
  scored = applyAttentionSafety(scored, attentionState, warnings);
  return applyDensityLimits(scored, attentionState, warnings);
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function computeHealthScore(
  warnings: readonly string[],
  criticalIssues: readonly string[],
  sanitizedOpportunities: readonly ContextOpportunity[],
  sanitizedDecisions: readonly VisibilityDecision[],
  sanitizedUIState: SurfaceUiState
): number {
  let score = 1;

  score -= criticalIssues.length * 0.25;
  score -= warnings.length * 0.04;

  const visibleDecisions = sanitizedDecisions.filter((decision) => decision.visible).length;
  const uiCount =
    sanitizedUIState.CALENDAR.length +
    sanitizedUIState.DOCK.length +
    sanitizedUIState.TIMELINE.length +
    sanitizedUIState.NARRATION.length;

  if (visibleDecisions > 0 && uiCount === 0) {
    score -= 0.2;
  }

  if (sanitizedOpportunities.length === 0 && sanitizedDecisions.length > 0) {
    score -= 0.3;
  }

  for (const surface of VALID_SURFACES) {
    const count = sanitizedUIState[surface].length;
    if (count > DENSITY_LIMITS[surface]) {
      score -= 0.1;
    }
  }

  return round2(clamp01(score));
}

/** CognitiveStabilityGuard v1 — validate and sanitize cognitive pipeline outputs. */
export function stabilizeCognitiveOutput(input: StabilityGuardInput): StabilityGuardResult {
  const warnings: string[] = [];
  const criticalIssues: string[] = [];

  const sanitizedContext = sanitizeContext(input.context, warnings, criticalIssues);
  const sanitizedOpportunities = sanitizeOpportunities(
    input.opportunities,
    warnings,
    criticalIssues
  );
  const opportunityIds = new Set(sanitizedOpportunities.map((opportunity) => opportunity.id));
  const sanitizedDecisions = sanitizeDecisions(
    input.visibilityDecisions,
    opportunityIds,
    warnings,
    criticalIssues
  );
  const sanitizedUIState = sanitizeUiState(
    input.uiState,
    sanitizedDecisions,
    sanitizedOpportunities,
    sanitizedContext.attentionState,
    warnings
  );

  const uniqueWarnings = uniqueSorted(warnings);
  const uniqueCriticalIssues = uniqueSorted(criticalIssues);
  const systemHealthScore = computeHealthScore(
    uniqueWarnings,
    uniqueCriticalIssues,
    sanitizedOpportunities,
    sanitizedDecisions,
    sanitizedUIState
  );

  return {
    isValid: uniqueCriticalIssues.length === 0,
    sanitizedContext,
    sanitizedOpportunities,
    sanitizedDecisions,
    sanitizedUIState,
    warnings: uniqueWarnings,
    criticalIssues: uniqueCriticalIssues,
    systemHealthScore,
  };
}
