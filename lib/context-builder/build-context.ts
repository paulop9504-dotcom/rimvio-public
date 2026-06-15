import type {
  AttentionState,
  CognitiveContext,
  CognitiveEvent,
  ContextBuilderOptions,
} from "@/lib/context-builder/types";
import { DISMISSAL_TAGS, URGENCY_TAGS } from "@/lib/context-builder/types";

const DEFAULT_HALF_LIFE_MS = 30 * 60 * 1000;
const DEFAULT_ATTENTION_WINDOW_MS = 15 * 60 * 1000;
const DEFAULT_MAX_INTENTS = 5;
const DEFAULT_MAX_SIGNALS = 5;
const IDLE_EVENT_THRESHOLD = 1;
const SCATTERED_EVENT_THRESHOLD = 5;
const SCATTERED_TAG_DIVERSITY = 0.62;
const FOCUSED_ENGAGEMENT_RATE = 0.45;

function clamp01(value: number): number {
  if (value <= 0) {
    return 0;
  }
  if (value >= 1) {
    return 1;
  }
  return value;
}

function recencyWeight(now: number, timestamp: number, halfLifeMs: number): number {
  const ageMs = Math.max(0, now - timestamp);
  return Math.pow(0.5, ageMs / halfLifeMs);
}

function normalizeTag(tag: string): string {
  return tag.trim().toLowerCase();
}

function hasUrgencyTag(tags: readonly string[]): boolean {
  return tags.some((tag) => URGENCY_TAGS.has(normalizeTag(tag)));
}

function hasDismissalTag(tags: readonly string[]): boolean {
  return tags.some((tag) => DISMISSAL_TAGS.has(normalizeTag(tag)));
}

function eventWeight(
  event: CognitiveEvent,
  now: number,
  halfLifeMs: number,
  tagFrequency: ReadonlyMap<string, number>
): number {
  const recency = recencyWeight(now, event.timestamp, halfLifeMs);
  const engagement = event.engaged ? 1 : 0.35;
  const repeatBoost = event.tags.some((tag) => (tagFrequency.get(normalizeTag(tag)) ?? 0) >= 2)
    ? 1.15
    : 1;
  const urgencyBoost = hasUrgencyTag(event.tags) ? 1.25 : 1;
  return recency * engagement * repeatBoost * urgencyBoost;
}

function buildTagFrequency(events: readonly CognitiveEvent[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const event of events) {
    const seen = new Set<string>();
    for (const tag of event.tags) {
      const key = normalizeTag(tag);
      if (!key || seen.has(key)) {
        continue;
      }
      seen.add(key);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return counts;
}

function extractActiveIntents(
  events: readonly CognitiveEvent[],
  now: number,
  halfLifeMs: number,
  tagFrequency: ReadonlyMap<string, number>,
  maxIntents: number
): string[] {
  const scores = new Map<string, number>();

  for (const event of events) {
    const weight = eventWeight(event, now, halfLifeMs, tagFrequency);
    const seen = new Set<string>();
    for (const tag of event.tags) {
      const key = normalizeTag(tag);
      if (!key || seen.has(key)) {
        continue;
      }
      seen.add(key);
      const frequency = tagFrequency.get(key) ?? 0;
      if (frequency === 1 && !event.engaged) {
        continue;
      }
      scores.set(key, (scores.get(key) ?? 0) + weight);
    }
  }

  return [...scores.entries()]
    .sort((left, right) => {
      if (right[1] !== left[1]) {
        return right[1] - left[1];
      }
      return left[0].localeCompare(right[0]);
    })
    .slice(0, maxIntents)
    .map(([tag]) => tag);
}

function resolveEmbeddingDim(events: readonly CognitiveEvent[]): number {
  for (const event of events) {
    if (event.embedding.length > 0) {
      return event.embedding.length;
    }
  }
  return 0;
}

function aggregateIntentVector(
  events: readonly CognitiveEvent[],
  now: number,
  halfLifeMs: number,
  tagFrequency: ReadonlyMap<string, number>,
  dim: number
): number[] {
  if (dim === 0) {
    return [];
  }

  const sum = new Array<number>(dim).fill(0);
  let totalWeight = 0;

  for (const event of events) {
    if (event.embedding.length !== dim) {
      continue;
    }
    const frequencyEligible = event.tags.some(
      (tag) => (tagFrequency.get(normalizeTag(tag)) ?? 0) >= 2
    );
    if (!event.engaged && !frequencyEligible) {
      continue;
    }

    const weight = eventWeight(event, now, halfLifeMs, tagFrequency);
    totalWeight += weight;
    for (let index = 0; index < dim; index += 1) {
      sum[index] = (sum[index] ?? 0) + (event.embedding[index] ?? 0) * weight;
    }
  }

  if (totalWeight <= 0) {
    return sum;
  }

  return sum.map((value) => Number((value / totalWeight).toFixed(6)));
}

function deriveAttentionState(
  events: readonly CognitiveEvent[],
  now: number,
  attentionWindowMs: number
): AttentionState {
  const recent = events.filter((event) => now - event.timestamp <= attentionWindowMs);

  if (recent.length <= IDLE_EVENT_THRESHOLD) {
    return "IDLE";
  }

  const uniqueTags = new Set<string>();
  let totalTagMentions = 0;
  for (const event of recent) {
    for (const tag of event.tags) {
      const key = normalizeTag(tag);
      if (!key) {
        continue;
      }
      uniqueTags.add(key);
      totalTagMentions += 1;
    }
  }

  const tagSpread = uniqueTags.size / Math.max(totalTagMentions, 1);
  const engagementRate =
    recent.filter((event) => event.engaged).length / Math.max(recent.length, 1);

  if (recent.length >= SCATTERED_EVENT_THRESHOLD) {
    return "SCATTERED";
  }

  if (recent.length >= 4 && tagSpread >= SCATTERED_TAG_DIVERSITY) {
    return "SCATTERED";
  }

  if (engagementRate >= FOCUSED_ENGAGEMENT_RATE && recent.length <= 4) {
    return "FOCUSED";
  }

  if (recent.length <= 3 && tagSpread <= 0.7) {
    return "FOCUSED";
  }

  return tagSpread >= 0.55 ? "SCATTERED" : "FOCUSED";
}

function buildRecentTopSignals(
  events: readonly CognitiveEvent[],
  now: number,
  halfLifeMs: number,
  tagFrequency: ReadonlyMap<string, number>,
  maxSignals: number
): string[] {
  const scored = events
    .map((event) => {
      const weight = eventWeight(event, now, halfLifeMs, tagFrequency);
      const urgency = hasUrgencyTag(event.tags) ? 1.2 : 1;
      const primaryTag = event.tags.map(normalizeTag).find(Boolean) ?? event.type.toLowerCase();
      return {
        signal: `${primaryTag}:${event.id}`,
        score: weight * urgency * (event.engaged ? 1.1 : 1),
        timestamp: event.timestamp,
      };
    })
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }
      if (right.timestamp !== left.timestamp) {
        return right.timestamp - left.timestamp;
      }
      return left.signal.localeCompare(right.signal);
    });

  const minSignals = Math.min(3, scored.length);
  const limit = Math.max(minSignals, Math.min(maxSignals, 7, scored.length));
  return scored.slice(0, limit).map((entry) => entry.signal);
}

function buildSuppressionMap(
  events: readonly CognitiveEvent[],
  now: number,
  halfLifeMs: number,
  tagFrequency: ReadonlyMap<string, number>
): Record<string, number> {
  const map: Record<string, number> = {};

  for (const event of events) {
    let score = 0;

    if (hasDismissalTag(event.tags)) {
      score = 0.92;
    } else if (!event.engaged) {
      const repeated = event.tags.some(
        (tag) => (tagFrequency.get(normalizeTag(tag)) ?? 0) >= 2
      );
      const ageMs = Math.max(0, now - event.timestamp);
      const stale = ageMs > halfLifeMs * 2;
      if (repeated && stale) {
        score = 0.72;
      } else if (repeated) {
        score = 0.48;
      } else if (stale) {
        score = 0.28;
      }
    }

    if (score > 0) {
      map[event.id] = Number(clamp01(score).toFixed(2));
    }
  }

  return map;
}

/** ContextBuilder v1 — deterministic cognitive state compression. */
export function buildContext(
  events: readonly CognitiveEvent[],
  options?: ContextBuilderOptions
): CognitiveContext {
  const now = options?.now ?? Date.now();
  const halfLifeMs = options?.recencyHalfLifeMs ?? DEFAULT_HALF_LIFE_MS;
  const attentionWindowMs = options?.attentionWindowMs ?? DEFAULT_ATTENTION_WINDOW_MS;
  const maxIntents = options?.maxActiveIntents ?? DEFAULT_MAX_INTENTS;
  const maxSignals = options?.maxTopSignals ?? DEFAULT_MAX_SIGNALS;

  const ordered = [...events].sort((left, right) => {
    if (left.timestamp !== right.timestamp) {
      return left.timestamp - right.timestamp;
    }
    return left.id.localeCompare(right.id);
  });

  if (ordered.length === 0) {
    return {
      now,
      userIntentVector: [],
      activeIntents: [],
      attentionState: "IDLE",
      recentTopSignals: [],
      suppressionMap: {},
    };
  }

  const tagFrequency = buildTagFrequency(ordered);
  const dim = resolveEmbeddingDim(ordered);

  return {
    now,
    userIntentVector: aggregateIntentVector(ordered, now, halfLifeMs, tagFrequency, dim),
    activeIntents: extractActiveIntents(ordered, now, halfLifeMs, tagFrequency, maxIntents),
    attentionState: deriveAttentionState(ordered, now, attentionWindowMs),
    recentTopSignals: buildRecentTopSignals(
      ordered,
      now,
      halfLifeMs,
      tagFrequency,
      maxSignals
    ),
    suppressionMap: buildSuppressionMap(ordered, now, halfLifeMs, tagFrequency),
  };
}
