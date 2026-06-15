import type {
  FailureKind,
  FixProposal,
  FixTarget,
  InteractionRecord,
} from "@/lib/self-learning/types";

export const FAILURE_THRESHOLD = 3;

const FIX_BY_KIND: Record<
  FailureKind,
  { target: FixTarget; action: FixProposal["action"] }
> = {
  routing_error: {
    target: "intent_mapping",
    action: "strengthen_routing_rule",
  },
  execution_error: {
    target: "executor_rule",
    action: "adjust_executor_rule",
  },
  ux_mismatch: {
    target: "router_prompt",
    action: "add_disambiguation_question",
  },
  unknown: {
    target: "confidence_threshold",
    action: "tighten_confidence_gate",
  },
};

function intentKey(record: InteractionRecord): string {
  return (
    record.routing?.routing_patch ??
    record.routing?.ai_intent ??
    record.routing?.chat_axis_route ??
    record.routing?.semantic_reason ??
    "unknown"
  );
}

/**
 * Propose prompt/rule/threshold updates — never auto-applies (anti-drift).
 * LLM weights are not touched; only system config targets.
 */
export function proposeSystemUpdates(
  records: readonly InteractionRecord[],
  threshold = FAILURE_THRESHOLD
): FixProposal[] {
  const failures = records.filter((record) => record.isFailure);
  const grouped = new Map<
    string,
    { count: number; kinds: Map<FailureKind, number>; sample: string }
  >();

  for (const record of failures) {
    const key = intentKey(record);
    const bucket = grouped.get(key) ?? {
      count: 0,
      kinds: new Map<FailureKind, number>(),
      sample: record.userMessage,
    };
    bucket.count += 1;
    bucket.kinds.set(
      record.failureKind,
      (bucket.kinds.get(record.failureKind) ?? 0) + 1
    );
    grouped.set(key, bucket);
  }

  const proposals: FixProposal[] = [];

  for (const [intentKeyValue, bucket] of grouped) {
    if (bucket.count < threshold) {
      continue;
    }

    let dominantKind: FailureKind = "unknown";
    let dominantCount = 0;
    for (const [kind, count] of bucket.kinds) {
      if (count > dominantCount) {
        dominantKind = kind;
        dominantCount = count;
      }
    }

    const fix = FIX_BY_KIND[dominantKind];
    proposals.push({
      target: fix.target,
      intentKey: intentKeyValue,
      reason: `${bucket.count} failures (${dominantKind}) — e.g. "${bucket.sample.slice(0, 60)}"`,
      action: fix.action,
      failureCount: bucket.count,
    });
  }

  return proposals.sort((a, b) => b.failureCount - a.failureCount);
}

export function shouldAutoImproveIntent(
  records: readonly InteractionRecord[],
  intentKeyValue: string,
  threshold = FAILURE_THRESHOLD
): boolean {
  const count = records.filter(
    (record) => record.isFailure && intentKey(record) === intentKeyValue
  ).length;
  return count > threshold;
}
