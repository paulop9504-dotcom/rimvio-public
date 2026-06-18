import type { AttentionState, CognitiveContext } from "@/lib/context-builder/types";
import type { ContextOpportunity, SurfaceHint } from "@/lib/cognitive-opportunity/types";
import {
  SURFACE_TIEBREAK_PRIORITY,
  VISIBILITY_SCORE_WEIGHTS,
  VISIBLE_CAP_BY_ATTENTION,
  type EvaluateVisibilityInput,
  type VisibilityBridgeResult,
  type VisibilityDecision,
  type VisibilitySurface,
} from "@/lib/visibility-bridge/types";

const DEFAULT_MAX_DECISIONS = 10;
const DEFAULT_VISIBILITY_THRESHOLD = 0.35;

function clamp01(value: number): number {
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

function surfacePriority(surface: VisibilitySurface): number {
  const index = SURFACE_TIEBREAK_PRIORITY.indexOf(surface);
  return index >= 0 ? SURFACE_TIEBREAK_PRIORITY.length - index : 0;
}

function maxSuppression(context: CognitiveContext, sourceEventIds: readonly string[]): number {
  let max = 0;
  for (const eventId of sourceEventIds) {
    max = Math.max(max, context.suppressionMap[eventId] ?? 0);
  }
  return max;
}

function computeVisibilityScore(opportunity: ContextOpportunity): number {
  return clamp01(
    opportunity.finalScore * VISIBILITY_SCORE_WEIGHTS.finalScore +
      opportunity.attentionFit * VISIBILITY_SCORE_WEIGHTS.attentionFit +
      opportunity.urgencyScore * VISIBILITY_SCORE_WEIGHTS.urgency
  );
}

function candidateSurfaces(
  opportunity: ContextOpportunity,
  context: CognitiveContext
): VisibilitySurface[] {
  const hint = opportunity.recommendedSurfaceHint;
  const surfaces = new Set<VisibilitySurface>([hint]);

  if (context.attentionState === "FOCUSED") {
    surfaces.add("CALENDAR");
    surfaces.add("TIMELINE");
  } else if (context.attentionState === "SCATTERED") {
    surfaces.add("DOCK");
  } else {
    surfaces.add("DOCK");
    surfaces.add("NARRATION");
  }

  return [...surfaces].sort((left, right) => surfacePriority(right) - surfacePriority(left));
}

function surfaceAffinity(
  surface: VisibilitySurface,
  opportunity: ContextOpportunity,
  attentionState: AttentionState
): number {
  switch (attentionState) {
    case "FOCUSED":
      if (surface === "CALENDAR" || surface === "TIMELINE") {
        return 0.12;
      }
      if (surface === "DOCK" && opportunity.type === "SUGGESTION") {
        return -0.28;
      }
      if (surface === "DOCK") {
        return -0.15;
      }
      return -0.08;
    case "SCATTERED":
      if (surface === "DOCK") {
        return 0.14;
      }
      if (surface === "CALENDAR") {
        return -0.22;
      }
      if (surface === "TIMELINE") {
        return -0.1;
      }
      return 0;
    default:
      if (surface === "DOCK" && opportunity.type === "REENGAGEMENT") {
        return 0.16;
      }
      if (surface === "NARRATION" && opportunity.type === "REENGAGEMENT") {
        return 0.14;
      }
      if (surface === "CALENDAR") {
        return -0.06;
      }
      return 0.05;
  }
}

function applyAttentionSurfaceOverride(
  opportunity: ContextOpportunity,
  context: CognitiveContext,
  surface: VisibilitySurface | null
): VisibilitySurface | null {
  if (!surface) {
    return null;
  }

  if (context.attentionState === "FOCUSED") {
    if (
      surface === "DOCK" &&
      (opportunity.type === "ACTION" || opportunity.type === "REMINDER")
    ) {
      return opportunity.urgencyScore >= 0.5 ? "CALENDAR" : "TIMELINE";
    }
    return surface;
  }

  if (context.attentionState === "SCATTERED") {
    if (surface === "CALENDAR" || surface === "TIMELINE") {
      return "DOCK";
    }
    return surface;
  }

  if (opportunity.type === "REENGAGEMENT" && surface === "CALENDAR") {
    return "NARRATION";
  }

  return surface;
}

function resolveSurface(
  opportunity: ContextOpportunity,
  context: CognitiveContext,
  visibilityScore: number
): { surface: VisibilitySurface | null; tieBreakReason: string } {
  const candidates = candidateSurfaces(opportunity, context);

  let bestSurface: VisibilitySurface | null = null;
  let bestScore = -Infinity;
  let tied: VisibilitySurface[] = [];

  for (const surface of candidates) {
    const score = visibilityScore + surfaceAffinity(surface, opportunity, context.attentionState);
    if (score > bestScore + 0.0001) {
      bestScore = score;
      bestSurface = surface;
      tied = [surface];
    } else if (Math.abs(score - bestScore) <= 0.0001) {
      tied.push(surface);
    }
  }

  if (tied.length <= 1 && bestSurface) {
    return {
      surface: bestSurface,
      tieBreakReason:
        bestSurface === opportunity.recommendedSurfaceHint
          ? "hint_accepted"
          : `attention_${context.attentionState.toLowerCase()}_override`,
    };
  }

  const winner = [...tied].sort((left, right) => surfacePriority(right) - surfacePriority(left))[0] ?? null;
  return {
    surface: winner,
    tieBreakReason: winner ? "tiebreak_surface_priority" : "no_valid_surface",
  };
}

function computeConfidence(opportunity: ContextOpportunity, visibilityScore: number): number {
  return round2(
    clamp01(
      visibilityScore * 0.55 +
        opportunity.intentAlignment * 0.25 +
        opportunity.relevanceScore * 0.2
    )
  );
}

function evaluateOne(
  opportunity: ContextOpportunity,
  context: CognitiveContext,
  threshold: number
): VisibilityDecision {
  const suppressionApplied = round2(maxSuppression(context, opportunity.sourceEventIds));
  let visibilityScore = round2(computeVisibilityScore(opportunity));

  if (suppressionApplied > 0) {
    visibilityScore = round2(Math.max(0, visibilityScore - suppressionApplied));
  }

  const hardSuppressed = suppressionApplied > 0.9;
  const belowThreshold = visibilityScore < threshold;

  const { surface: resolvedSurface, tieBreakReason } = resolveSurface(
    opportunity,
    context,
    visibilityScore
  );
  const surface = applyAttentionSurfaceOverride(opportunity, context, resolvedSurface);

  let visible = !hardSuppressed && !belowThreshold && surface != null;

  let reason = tieBreakReason;
  if (surface !== resolvedSurface && surface) {
    reason = `${tieBreakReason};attention_${context.attentionState.toLowerCase()}_override`;
  }
  if (hardSuppressed) {
    visible = false;
    reason = "suppression_hard_block";
  } else if (belowThreshold) {
    visible = false;
    reason = "below_visibility_threshold";
  } else if (suppressionApplied > 0) {
    reason = `${tieBreakReason};suppression_applied`;
  }

  return {
    opportunityId: opportunity.id,
    visible,
    surface: visible ? surface : null,
    visibilityScore,
    confidence: computeConfidence(opportunity, visibilityScore),
    finalSurface: visible && surface ? surface : "none",
    tieBreakReason: reason,
    suppressionApplied,
  };
}

function decisionSortKey(left: VisibilityDecision, right: VisibilityDecision): number {
  if (left.visibilityScore !== right.visibilityScore) {
    return right.visibilityScore - left.visibilityScore;
  }
  return left.opportunityId.localeCompare(right.opportunityId);
}

function applyVisibleCap(
  decisions: VisibilityDecision[],
  attentionState: AttentionState
): VisibilityDecision[] {
  const cap = VISIBLE_CAP_BY_ATTENTION[attentionState];
  let visibleCount = 0;

  return decisions.map((decision) => {
    if (!decision.visible) {
      return decision;
    }
    visibleCount += 1;
    if (visibleCount <= cap) {
      return decision;
    }
    return {
      ...decision,
      visible: false,
      surface: null,
      finalSurface: "none",
      tieBreakReason: `${decision.tieBreakReason};visible_cap_exceeded`,
    };
  });
}

/** VisibilityBridge v1 — Context + Opportunities → surface visibility decisions. */
export function evaluateVisibility(input: EvaluateVisibilityInput): VisibilityBridgeResult {
  const { context, opportunities, options } = input;
  const maxDecisions = Math.min(options?.maxDecisions ?? DEFAULT_MAX_DECISIONS, 10);
  const threshold = options?.visibilityThreshold ?? DEFAULT_VISIBILITY_THRESHOLD;

  const ordered = [...opportunities]
    .slice(0, maxDecisions)
    .sort((left, right) => left.id.localeCompare(right.id));

  const decisions = applyVisibleCap(
    ordered
      .map((opportunity) => evaluateOne(opportunity, context, threshold))
      .sort(decisionSortKey),
    context.attentionState
  );

  return { decisions };
}
