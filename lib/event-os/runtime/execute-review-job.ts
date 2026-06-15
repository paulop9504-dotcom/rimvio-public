import type { ReviewExecutionInput } from "@/lib/event-os/review-execution-types";
import {
  runCommandCreateStep,
  runActionStep,
  runSearchStep,
} from "@/lib/event-os/command-execution-steps";
import type { CommandOsExecutionPayload } from "@/lib/event-os/review-execution-types";
import {
  runApproveStep,
  runConfirmStep,
  runDateStep,
  type ReviewStepOutcome,
} from "@/lib/event-os/execution-steps";

function isCommandPayload(
  payload: ReviewExecutionInput["payload"]
): payload is CommandOsExecutionPayload {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "eventCandidateId" in payload
  );
}

/** Step dispatch for runtime-owned execution (lock held by orchestrator). */
export function executeReviewJob(
  job: ReviewExecutionInput
): ReviewStepOutcome {
  const scopeId = job.scopeId;
  const now = new Date(
    job.payload.clockIso ?? job.enqueuedAt ?? new Date().toISOString()
  );
  const runtimeOwned = true;

  switch (job.type) {
    case "approve":
      return runApproveStep({
        message:
          "message" in job.payload ? (job.payload.message ?? "맞아") : "맞아",
        scopeId,
        now,
        runtimeOwned,
      });
    case "date":
      return runDateStep({
        patches:
          "patches" in job.payload ? job.payload.patches : [],
        scopeId,
        now,
        runtimeOwned,
      });
    case "confirm":
      return runConfirmStep({
        message:
          "message" in job.payload ? (job.payload.message ?? "응") : "응",
        scopeId,
        now,
        syncClient:
          "syncClient" in job.payload ? job.payload.syncClient : false,
        runtimeOwned,
      });
    case "search":
      if (!isCommandPayload(job.payload)) {
        throw new Error("command_payload_required");
      }
      return runSearchStep({
        payload: job.payload,
        scopeId,
        now,
        runtimeOwned,
      });
    case "action":
      if (!isCommandPayload(job.payload)) {
        throw new Error("command_payload_required");
      }
      return runActionStep({
        payload: job.payload,
        scopeId,
        now,
        runtimeOwned,
      });
    case "command":
      if (!isCommandPayload(job.payload)) {
        throw new Error("command_payload_required");
      }
      return runCommandCreateStep({
        payload: job.payload,
        scopeId,
        now,
        runtimeOwned,
      });
    default:
      throw new Error(`unknown_review_job:${job.type}`);
  }
}
