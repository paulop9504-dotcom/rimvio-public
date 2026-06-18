import { extractCommandContext } from "@/lib/command-os/extract-command-context";
import { mapIntentToExecutionType } from "@/lib/command-os/map-intent-to-execution-type";
import { parseCommandInput } from "@/lib/command-os/parse-command-input";
import { resolveIntentFromParsed } from "@/lib/command-os/resolve-command-intent";
import {
  registerCommandEventCandidate,
} from "@/lib/command-os/command-event-candidate-store";
import { validateCommandCompile } from "@/lib/command-os/validate-command-compile";
import type { CommandCompileResult } from "@/lib/command-os/command-os-types";
import { enqueueReviewExecution } from "@/lib/event-os/review-execution-queue";
import type {
  CommandOsExecutionPayload,
  ReviewExecutionInput,
} from "@/lib/event-os/review-execution-types";

function buildEnqueuePayload(
  candidate: ReturnType<typeof registerCommandEventCandidate>
): CommandOsExecutionPayload {
  return {
    eventCandidateId: candidate.id,
    intent: candidate.intent,
    rawInput: candidate.rawInput,
    normalizedQuery: candidate.normalizedQuery,
    command: candidate.command,
    extractedContext: candidate.extractedContext,
    clockIso: candidate.createdAt,
  };
}

/**
 * Command OS compiler — AST (EventCandidate) → bytecode (enqueueReviewExecution).
 * No SSOT mutation in this layer.
 */
export function compileCommandToEventOs(rawInput: string): CommandCompileResult {
  const parsed = parseCommandInput(rawInput);
  if (!parsed) {
    throw new Error("command_parse_failed");
  }

  const { intent, resolvedVia } = resolveIntentFromParsed(parsed);
  const extractedContext = extractCommandContext(parsed.query);

  const candidate = registerCommandEventCandidate({
    intent,
    rawInput: parsed.rawInput,
    normalizedQuery: parsed.query,
    command: parsed.command,
    extractedContext,
    intentResolvedVia: resolvedVia,
  });

  const executionType = mapIntentToExecutionType(intent);
  const payload = buildEnqueuePayload(candidate);

  const enqueueInput: ReviewExecutionInput = {
    scopeId: candidate.id,
    type: executionType,
    payload,
  };

  const failures = validateCommandCompile({
    candidate,
    enqueueInput,
  });
  if (failures.length > 0) {
    throw new Error(`command_compile_guard:${failures.join(",")}`);
  }

  const runtime = enqueueReviewExecution(enqueueInput);

  return {
    candidate,
    runtime,
  };
}
