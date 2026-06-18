import type { PendingEventCandidate } from "@/lib/event-kernel/review/pending-event-candidate-store";

export type MissingFieldCode =
  | "MISSING_DATE"
  | "MISSING_TIME"
  | "AMBIGUOUS_TITLE";

export type PendingCandidateValidation = {
  candidateId: string;
  status: "ready" | "needs_input";
  blockedBy: MissingFieldCode[];
  title: string;
  date: string | null;
  time: string | null;
};

function isoDateFromStart(start: string): string | null {
  const match = /^(\d{4}-\d{2}-\d{2})T/.exec(start);
  return match?.[1] ?? null;
}

function isoTimeFromStart(start: string): string | null {
  const match = /T(\d{2}):(\d{2})/.exec(start);
  return match ? `${match[1]}:${match[2]}` : null;
}

export function validatePendingEventCandidate(
  candidate: PendingEventCandidate
): PendingCandidateValidation {
  const blockedBy: MissingFieldCode[] = [];
  const date =
    candidate.date ?? isoDateFromStart(candidate.start) ?? null;
  const time =
    candidate.time ?? isoTimeFromStart(candidate.start) ?? null;

  if (!date) {
    blockedBy.push("MISSING_DATE");
  }
  if (!time) {
    blockedBy.push("MISSING_TIME");
  }
  if (!candidate.title?.trim() || candidate.title === "일정") {
    blockedBy.push("AMBIGUOUS_TITLE");
  }

  return {
    candidateId: candidate.id,
    status: blockedBy.length === 0 ? "ready" : "needs_input",
    blockedBy,
    title: candidate.title,
    date,
    time,
  };
}

export function validatePendingEventCandidates(
  candidates: readonly PendingEventCandidate[]
): PendingCandidateValidation[] {
  return candidates.map(validatePendingEventCandidate);
}
