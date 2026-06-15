import { applyDatePatchToCandidate } from "@/lib/event-kernel/review/pending-event-candidate-dates";
import type { OcrExtractedEvent } from "@/lib/events/ocr-event-extraction-types";

export type PendingEventCandidate = OcrExtractedEvent & {
  id: string;
};

const DEFAULT_SCOPE = "default";

let candidatesByScope = new Map<string, Map<string, PendingEventCandidate>>();
let deterministicIdsForTests = false;
let deterministicIdSeq = 0;

function newCandidateId(): string {
  if (deterministicIdsForTests) {
    deterministicIdSeq += 1;
    return `ocr-cand-test-${deterministicIdSeq}`;
  }
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `ocr-cand-${crypto.randomUUID()}`;
  }
  return `ocr-cand-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function enableDeterministicPendingIdsForTests(): void {
  deterministicIdsForTests = true;
  deterministicIdSeq = 0;
}

export function resetPendingEventCandidatesForTests(scopeId = DEFAULT_SCOPE) {
  candidatesByScope.delete(scopeId);
  deterministicIdSeq = 0;
}

export function registerPendingEventCandidates(
  events: OcrExtractedEvent[],
  scopeId = DEFAULT_SCOPE
): string[] {
  const bucket =
    candidatesByScope.get(scopeId) ?? new Map<string, PendingEventCandidate>();
  const ids: string[] = [];

  for (const event of events) {
    const id = newCandidateId();
    bucket.set(id, { ...event, id });
    ids.push(id);
  }

  candidatesByScope.set(scopeId, bucket);
  return ids;
}

export function getPendingEventCandidate(
  id: string,
  scopeId = DEFAULT_SCOPE
): PendingEventCandidate | null {
  return candidatesByScope.get(scopeId)?.get(id) ?? null;
}

export function loadPendingEventCandidates(
  candidateIds: readonly string[],
  scopeId = DEFAULT_SCOPE
): PendingEventCandidate[] {
  const bucket = candidatesByScope.get(scopeId);
  if (!bucket) {
    return [];
  }

  return candidateIds
    .map((id) => bucket.get(id) ?? null)
    .filter((row): row is PendingEventCandidate => row !== null);
}

export function clearPendingEventCandidates(scopeId = DEFAULT_SCOPE) {
  candidatesByScope.delete(scopeId);
}

export function applyPendingEventCandidateDatePatches(
  patches: ReadonlyArray<{ candidateId: string; date: string }>,
  scopeId = DEFAULT_SCOPE
): PendingEventCandidate[] {
  const bucket = candidatesByScope.get(scopeId);
  if (!bucket) {
    return [];
  }

  const updated: PendingEventCandidate[] = [];
  for (const patch of patches) {
    const row = bucket.get(patch.candidateId);
    if (!row) {
      continue;
    }
    const next = applyDatePatchToCandidate(row, patch.date);
    bucket.set(patch.candidateId, next);
    updated.push(next);
  }

  return updated;
}
