import type { EventCandidate } from "@/lib/events/event-candidate";
import {
  EXPERIENCE_INTENT_META_KEYS,
  type IntentResolution,
} from "@/lib/experience-intent/experience-intent-types";
import { resolveExperienceIntent } from "@/lib/experience-intent/resolve-experience-intent";

/** Stamp intent resolution onto event metadata (non-destructive merge). */
export function stampExperienceIntentMetadata(
  base: Record<string, unknown> | undefined,
  resolution: IntentResolution,
): Record<string, unknown> {
  const next: Record<string, unknown> = { ...base };
  next[EXPERIENCE_INTENT_META_KEYS.intent] = resolution.intent;
  next[EXPERIENCE_INTENT_META_KEYS.confidence] = resolution.confidence;
  next[EXPERIENCE_INTENT_META_KEYS.score] = resolution.score;
  next[EXPERIENCE_INTENT_META_KEYS.evidence] = resolution.evidence;
  next[EXPERIENCE_INTENT_META_KEYS.resolvedAt] = resolution.resolvedAt;
  if (resolution.runnerUp) {
    next[EXPERIENCE_INTENT_META_KEYS.runnerUp] = resolution.runnerUp;
  } else {
    delete next[EXPERIENCE_INTENT_META_KEYS.runnerUp];
  }
  return next;
}

/** Resolve + stamp in one pass — for commit adapters. */
export function resolveAndStampExperienceIntent(
  event: EventCandidate,
): { event: EventCandidate; resolution: IntentResolution } {
  const resolution = resolveExperienceIntent(event);
  return {
    resolution,
    event: {
      ...event,
      metadata: stampExperienceIntentMetadata(event.metadata, resolution),
    },
  };
}
