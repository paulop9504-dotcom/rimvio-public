import type { EventKernelStrictOutput } from "@/lib/event-kernel/serialize-event-kernel-output";
import { KERNEL_MICRO_INTENT_KEYS } from "@/lib/event-kernel/types";
import { EVENT_KERNEL_SCHEMA_LOCK_VERSION } from "@/lib/event-kernel/schema-lock/version";

export const LOCKED_KERNEL_OUTPUT_SCHEMA_VERSION = "event-kernel-output.v1" as const;

export const LOCKED_KERNEL_COMMIT_DECISIONS = [
  "DIRECT_ACTION",
  "OPTIONS",
  "CLARIFY",
] as const;

export const LOCKED_KERNEL_OUTPUT_KEYS = [
  "frame",
  "micro_intent",
  "entropy",
  "decision",
  "response_hint",
] as const;

const decisionSet = new Set<string>(LOCKED_KERNEL_COMMIT_DECISIONS);

export type KernelOutputValidationIssue = { code: string; path?: string };

export function validateEventKernelStrictOutput(
  output: unknown,
): KernelOutputValidationIssue[] {
  const issues: KernelOutputValidationIssue[] = [];
  if (!output || typeof output !== "object") {
    return [{ code: "output_not_object" }];
  }
  const row = output as Record<string, unknown>;
  for (const key of LOCKED_KERNEL_OUTPUT_KEYS) {
    if (!(key in row)) {
      issues.push({ code: "missing_key", path: key });
    }
  }
  if (typeof row.decision !== "string" || !decisionSet.has(row.decision)) {
    issues.push({ code: "invalid_decision", path: "decision" });
  }
  const entropy = Number(row.entropy);
  if (Number.isNaN(entropy) || entropy < 0 || entropy > 1) {
    issues.push({ code: "invalid_entropy", path: "entropy" });
  }
  const micro = row.micro_intent;
  if (!micro || typeof micro !== "object") {
    issues.push({ code: "invalid_micro_intent", path: "micro_intent" });
  } else {
    let sum = 0;
    for (const key of KERNEL_MICRO_INTENT_KEYS) {
      const p = Number((micro as Record<string, unknown>)[key]);
      if (Number.isNaN(p) || p < 0 || p > 1) {
        issues.push({ code: "invalid_micro_probability", path: key });
      } else {
        sum += p;
      }
    }
    if (Math.abs(sum - 1) > 0.02) {
      issues.push({ code: "micro_intent_sum_not_one", path: "micro_intent" });
    }
  }
  const frame = row.frame;
  if (!frame || typeof frame !== "object") {
    issues.push({ code: "invalid_frame", path: "frame" });
  }
  return issues;
}

export function assertValidEventKernelStrictOutput(output: EventKernelStrictOutput): void {
  const issues = validateEventKernelStrictOutput(output);
  if (issues.length > 0) {
    throw new Error(
      `[schema-lock:${EVENT_KERNEL_SCHEMA_LOCK_VERSION}] kernel output invalid: ${issues.map((i) => i.code).join(",")}`,
    );
  }
}
