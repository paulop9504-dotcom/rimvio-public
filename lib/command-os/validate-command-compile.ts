import type { CommandEventCandidate } from "@/lib/command-os/command-os-types";
import type { ReviewExecutionInput } from "@/lib/event-os/review-execution-types";
import { getCommandEventCandidate } from "@/lib/command-os/command-event-candidate-store";

export function validateCommandCompile(input: {
  candidate: CommandEventCandidate | null;
  enqueueInput: ReviewExecutionInput | null;
}): string[] {
  const failures: string[] = [];

  if (!input.candidate) {
    failures.push("event_candidate_missing");
  }

  if (!input.enqueueInput) {
    failures.push("enqueue_without_candidate");
    return failures;
  }

  if (!input.candidate) {
    return failures;
  }

  if (input.enqueueInput.scopeId !== input.candidate.id) {
    failures.push("enqueue_scope_mismatch");
  }

  const stored = getCommandEventCandidate(input.candidate.id);
  if (!stored) {
    failures.push("candidate_not_registered");
  }

  const payload = input.enqueueInput.payload;
  if (!("eventCandidateId" in payload)) {
    failures.push("enqueue_payload_not_structured");
  } else if (payload.eventCandidateId !== input.candidate.id) {
    failures.push("enqueue_payload_candidate_mismatch");
  }

  if (input.candidate.intent === "UNKNOWN") {
    failures.push("intent_ambiguous_unresolved");
  }

  return failures;
}
