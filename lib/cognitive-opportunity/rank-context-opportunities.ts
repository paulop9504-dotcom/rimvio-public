import type { AttentionState, CognitiveContext, CognitiveEvent } from "@/lib/context-builder/types";
import { URGENCY_TAGS } from "@/lib/context-builder/types";
import {
  FINAL_SCORE_WEIGHTS,
  type ContextOpportunity,
  type ContextOpportunityOptions,
  type ContextOpportunityResult,
  type OpportunityKind,
  type RankContextInput,
  type SurfaceHint,
} from "@/lib/cognitive-opportunity/types";

const DEFAULT_MAX_RESULTS = 10;
const DEFAULT_MIN_FINAL_SCORE = 0.18;
const RECENCY_HALF_LIFE_MS = 30 * 60 * 1000;

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

function normalizeTag(tag: string): string {
  return tag.trim().toLowerCase();
}

function cosineSimilarity(left: readonly number[], right: readonly number[]): number {
  if (left.length === 0 || right.length === 0 || left.length !== right.length) {
    return 0;
  }

  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;

  for (let index = 0; index < left.length; index += 1) {
    const a = left[index] ?? 0;
    const b = right[index] ?? 0;
    dot += a * b;
    leftNorm += a * a;
    rightNorm += b * b;
  }

  if (leftNorm <= 0 || rightNorm <= 0) {
    return 0;
  }

  return clamp01(dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm)));
}

function recencyWeight(now: number, timestamp: number): number {
  const ageMs = Math.max(0, now - timestamp);
  return Math.pow(0.5, ageMs / RECENCY_HALF_LIFE_MS);
}

function parseSignalEventId(signal: string): string | null {
  const separator = signal.lastIndexOf(":");
  if (separator <= 0) {
    return null;
  }
  return signal.slice(separator + 1).trim() || null;
}

function resolveEventPool(
  context: CognitiveContext,
  eventPool?: readonly CognitiveEvent[]
): CognitiveEvent[] {
  if (eventPool?.length) {
    return [...eventPool].sort((left, right) => left.id.localeCompare(right.id));
  }

  const ids = new Set<string>();
  for (const signal of context.recentTopSignals) {
    const eventId = parseSignalEventId(signal);
    if (eventId) {
      ids.add(eventId);
    }
  }

  return [...ids].map((id) => {
    const signal = context.recentTopSignals.find((entry) => entry.endsWith(`:${id}`)) ?? id;
    const tag = signal.includes(":") ? signal.slice(0, signal.indexOf(":")) : "signal";
    return {
      id,
      type: "Event" as const,
      timestamp: context.now,
      tags: [tag],
      embedding: context.userIntentVector,
      engaged: false,
    };
  });
}

function scoreIntentAlignment(event: CognitiveEvent, activeIntents: readonly string[]): number {
  if (activeIntents.length === 0 || event.tags.length === 0) {
    return 0.2;
  }

  const intentSet = new Set(activeIntents.map(normalizeTag));
  let matches = 0;
  for (const tag of event.tags) {
    if (intentSet.has(normalizeTag(tag))) {
      matches += 1;
    }
  }

  return clamp01(matches / Math.max(event.tags.length, 1));
}

function scoreRelevance(
  event: CognitiveEvent,
  context: CognitiveContext
): number {
  const similarity = cosineSimilarity(event.embedding, context.userIntentVector);
  const signalBoost = context.recentTopSignals.some((signal) => signal.endsWith(`:${event.id}`))
    ? 0.12
    : 0;
  let score = clamp01(similarity + signalBoost + (event.engaged ? 0.1 : 0));

  const suppression = context.suppressionMap[event.id];
  if (suppression != null) {
    score *= 1 - clamp01(suppression);
  }

  return score;
}

function scoreUrgency(event: CognitiveEvent, now: number): number {
  const recency = recencyWeight(now, event.timestamp);
  const urgencyTagBoost = event.tags.some((tag) => URGENCY_TAGS.has(normalizeTag(tag))) ? 0.35 : 0;
  return clamp01(recency * 0.65 + urgencyTagBoost);
}

function scoreAttentionFit(
  attentionState: AttentionState,
  kind: OpportunityKind,
  finalParts: { relevance: number; urgency: number }
): number {
  switch (attentionState) {
    case "FOCUSED":
      if (kind === "ACTION" || kind === "REMINDER") {
        return clamp01(0.75 + finalParts.urgency * 0.25);
      }
      return clamp01(0.45 + finalParts.relevance * 0.2);
    case "SCATTERED":
      if (kind === "SUGGESTION") {
        return 0.35;
      }
      return clamp01(0.55 - finalParts.urgency * 0.15);
    default:
      if (kind === "REENGAGEMENT") {
        return 0.82;
      }
      return clamp01(0.5 + finalParts.relevance * 0.15);
  }
}

function classifyOpportunityKind(
  event: CognitiveEvent,
  context: CognitiveContext,
  scores: { relevance: number; urgency: number; intentAlignment: number }
): OpportunityKind {
  const suppression = context.suppressionMap[event.id] ?? 0;

  if (context.attentionState === "IDLE" && suppression >= 0.25 && suppression < 0.9) {
    return "REENGAGEMENT";
  }

  if (scores.urgency >= 0.62 && event.tags.some((tag) => URGENCY_TAGS.has(normalizeTag(tag)))) {
    return "REMINDER";
  }

  if (event.engaged || scores.intentAlignment >= 0.55) {
    return "ACTION";
  }

  return "SUGGESTION";
}

function recommendSurface(
  kind: OpportunityKind,
  event: CognitiveEvent,
  context: CognitiveContext
): SurfaceHint {
  const timeBound = event.tags.some((tag) => {
    const key = normalizeTag(tag);
    return key === "scheduled" || key === "deadline" || key === "calendar";
  });

  if (timeBound || kind === "REMINDER") {
    return "CALENDAR";
  }

  if (kind === "REENGAGEMENT") {
    return "NARRATION";
  }

  if (context.recentTopSignals.length >= 3 && kind !== "ACTION") {
    return "TIMELINE";
  }

  if (kind === "SUGGESTION") {
    return "DOCK";
  }

  return kind === "ACTION" ? "DOCK" : "TIMELINE";
}

function buildReasonSignals(
  event: CognitiveEvent,
  context: CognitiveContext,
  scores: {
    relevance: number;
    urgency: number;
    intentAlignment: number;
    attentionFit: number;
  }
): string[] {
  const signals: string[] = [];

  if (scores.intentAlignment >= 0.5) {
    signals.push("intent_match");
  }
  if (scores.urgency >= 0.6) {
    signals.push("time_sensitive");
  }
  if (event.engaged) {
    signals.push("engaged");
  }
  if (context.recentTopSignals.some((signal) => signal.endsWith(`:${event.id}`))) {
    signals.push("recent_signal");
  }
  if (context.suppressionMap[event.id] != null) {
    signals.push("suppressed");
  }
  signals.push(`attention:${context.attentionState.toLowerCase()}`);

  return signals.slice(0, 6);
}

function computeFinalScore(scores: {
  relevance: number;
  urgency: number;
  intentAlignment: number;
  attentionFit: number;
}): number {
  return clamp01(
    scores.relevance * FINAL_SCORE_WEIGHTS.relevance +
      scores.urgency * FINAL_SCORE_WEIGHTS.urgency +
      scores.intentAlignment * FINAL_SCORE_WEIGHTS.intentAlignment +
      scores.attentionFit * FINAL_SCORE_WEIGHTS.attentionFit
  );
}

function rankKey(left: ContextOpportunity, right: ContextOpportunity): number {
  if (left.finalScore !== right.finalScore) {
    return right.finalScore - left.finalScore;
  }
  return left.id.localeCompare(right.id);
}

function scoreEventOpportunity(
  event: CognitiveEvent,
  context: CognitiveContext
): ContextOpportunity | null {
  const suppression = context.suppressionMap[event.id];
  if (suppression != null && suppression > 0.9) {
    return null;
  }

  const relevanceScore = round2(scoreRelevance(event, context));
  const urgencyScore = round2(scoreUrgency(event, context.now));
  const intentAlignment = round2(scoreIntentAlignment(event, context.activeIntents));

  const kind = classifyOpportunityKind(event, context, {
    relevance: relevanceScore,
    urgency: urgencyScore,
    intentAlignment,
  });

  const attentionFit = round2(
    scoreAttentionFit(context.attentionState, kind, {
      relevance: relevanceScore,
      urgency: urgencyScore,
    })
  );

  const finalScore = round2(
    computeFinalScore({
      relevance: relevanceScore,
      urgency: urgencyScore,
      intentAlignment,
      attentionFit,
    })
  );

  return {
    id: `opp:${event.id}:${kind}`,
    type: kind,
    sourceEventIds: [event.id],
    relevanceScore,
    urgencyScore,
    intentAlignment,
    attentionFit,
    finalScore,
    recommendedSurfaceHint: recommendSurface(kind, event, context),
    reasonSignals: buildReasonSignals(event, context, {
      relevance: relevanceScore,
      urgency: urgencyScore,
      intentAlignment,
      attentionFit,
    }),
  };
}

/** OpportunityEngine v1 — Context → ranked decision-ready opportunities. */
export function rankContextOpportunities(input: RankContextInput): ContextOpportunityResult {
  const { context, eventPool, options } = input;
  const maxResults = Math.min(options?.maxResults ?? DEFAULT_MAX_RESULTS, 10);
  const minFinalScore = options?.minFinalScore ?? DEFAULT_MIN_FINAL_SCORE;

  const pool = resolveEventPool(context, eventPool);
  const opportunities = pool
    .map((event) => scoreEventOpportunity(event, context))
    .filter((item): item is ContextOpportunity => item != null)
    .filter((item) => item.finalScore >= minFinalScore)
    .sort(rankKey)
    .slice(0, maxResults);

  if (context.attentionState === "FOCUSED") {
    return { opportunities: opportunities.slice(0, Math.min(maxResults, 5)) };
  }

  if (context.attentionState === "SCATTERED") {
    return { opportunities: opportunities.slice(0, Math.min(maxResults, 4)) };
  }

  return { opportunities };
}
