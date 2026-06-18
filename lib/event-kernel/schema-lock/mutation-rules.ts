import {
  LOCKED_EVENT_LIFECYCLES,
  type LockedEventLifecycle,
} from "@/lib/event-kernel/schema-lock/event-schema";
import { EVENT_KERNEL_SCHEMA_LOCK_VERSION } from "@/lib/event-kernel/schema-lock/version";

/** Monotonic lifecycle order — same as `LIFECYCLE_ORDER` in event-lifecycle. */
export const LOCKED_LIFECYCLE_ORDER = LOCKED_EVENT_LIFECYCLES;

/** Sole exported write API surface for Event SSOT. */
export const LOCKED_SSOT_WRITE_APIS = [
  "commitEventUpsert",
  "commitEventLifecycle",
  "commitEventWireFromApi",
] as const;

/** Modules allowed to call commit-truth (ingest + client apply). */
export const LOCKED_SSOT_WRITE_CALLER_PREFIXES = [
  "lib/source-of-truth/",
  "lib/events/event-ingest-pipeline",
  "lib/events/link-reminder-ingest",
  "lib/events/chat-scheduled-ingest",
  "lib/events/google-calendar-ingest",
  "lib/events/notification-ingest",
  "lib/events/event-lifecycle-runner",
  "lib/action-event-registry/",
  "hooks/use-action-chat",
] as const;

export type LifecycleMutationIssue = { code: string; from?: string; to?: string };

function lifecycleRank(state: LockedEventLifecycle): number {
  return LOCKED_LIFECYCLE_ORDER.indexOf(state);
}

/** Forward-only lifecycle transitions (no skip-back, no lateral). */
export function isAllowedLifecycleMutation(
  from: LockedEventLifecycle,
  to: LockedEventLifecycle,
): boolean {
  const fromIndex = lifecycleRank(from);
  const toIndex = lifecycleRank(to);
  if (fromIndex < 0 || toIndex < 0) {
    return false;
  }
  return toIndex > fromIndex;
}

export function validateLifecycleMutation(
  from: LockedEventLifecycle,
  to: LockedEventLifecycle,
): LifecycleMutationIssue[] {
  if (!isAllowedLifecycleMutation(from, to)) {
    return [{ code: "lifecycle_mutation_forbidden", from, to }];
  }
  return [];
}

export function assertAllowedLifecycleMutation(
  from: LockedEventLifecycle,
  to: LockedEventLifecycle,
): void {
  const issues = validateLifecycleMutation(from, to);
  if (issues.length > 0) {
    throw new Error(
      `[schema-lock:${EVENT_KERNEL_SCHEMA_LOCK_VERSION}] ${issues[0]!.code}:${from}->${to}`,
    );
  }
}

export function mutationRulesMeta() {
  return {
    schemaLockVersion: EVENT_KERNEL_SCHEMA_LOCK_VERSION,
    lifecycleOrder: LOCKED_LIFECYCLE_ORDER,
    ssotWriteApis: LOCKED_SSOT_WRITE_APIS,
  };
}
