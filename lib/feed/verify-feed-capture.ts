"use client";

import { findEventCandidate } from "@/lib/events/event-store";
import { advanceEventLifecycle } from "@/lib/events/event-lifecycle";
import type { EventCandidate } from "@/lib/events/event-candidate";
import {
  hasPendingFeedCaptureVerify,
  markFeedCapturesVerified,
} from "@/lib/feed/feed-capture-metadata";
import { commitEventUpsert } from "@/lib/source-of-truth/commit-truth";

export type VerifyFeedCaptureResult = {
  ok: boolean;
  event: EventCandidate | null;
  alreadyVerified: boolean;
};

/** One-tap confirm — auto-attached Search captures are verified on Feed. */
export function verifyFeedCaptureEvent(eventId: string): VerifyFeedCaptureResult {
  const id = eventId.trim();
  if (!id) {
    return { ok: false, event: null, alreadyVerified: false };
  }

  const existing = findEventCandidate(id);
  if (!existing) {
    return { ok: false, event: null, alreadyVerified: false };
  }

  if (!hasPendingFeedCaptureVerify(existing)) {
    return { ok: true, event: existing, alreadyVerified: true };
  }

  let lifecycle = existing.lifecycle;
  if (lifecycle === "mentioned" || lifecycle === "candidate") {
    lifecycle = advanceEventLifecycle(existing, "confirmed").lifecycle;
  }

  const saved = commitEventUpsert({
    id: existing.id,
    title: existing.title,
    category: existing.category,
    source: existing.source,
    lifecycle,
    datetime: existing.datetime,
    place: existing.place,
    containerId: existing.containerId,
    confidence: Math.min(0.95, existing.confidence + 0.06),
    metadata: markFeedCapturesVerified(existing.metadata),
    lifecycleUpdatedAt: existing.lifecycleUpdatedAt,
  });

  return { ok: true, event: saved, alreadyVerified: false };
}
