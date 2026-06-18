import {
  invalidateActionProjection,
} from "@/lib/action-projection/action-projection-cache";
import { composeActionProjection } from "@/lib/action-projection/compose-action-projection";
import { projectActionCalendarChips } from "@/lib/action-projection/project-action-calendar";
import { buildActionCalendar } from "@/lib/calendar/build-action-calendar";
import type { CausalProof } from "@/lib/event-os/causal-proof-types";
import {
  runApproveStep,
  runConfirmStep,
  runDateStep,
} from "@/lib/event-os/execution-steps";
import { snapshotEventOsState } from "@/lib/event-os/snapshot-event-os-state";
import { proofToLegacyTrace } from "@/lib/event-os/validate-causal-trace";
import type { EventOsCausalTrace } from "@/lib/event-os/causal-trace-types";
import {
  listEventCalendarRows,
  projectEventCalendarChips,
} from "@/lib/events/project-event-calendar";

/** @deprecated Prefer CausalProof from runApproveStep — legacy alias */
export type { CausalProof as EventOsCausalTraceProof } from "@/lib/event-os/causal-proof-types";

/** 3.1 — "맞아" with missing date → BLOCKED + DATE_PICKER. */
export function traceApproveCandidate(input: {
  message?: string;
  scopeId?: string;
  now?: Date;
}): CausalProof {
  const now = input.now ?? new Date("2026-06-01T12:00:00");
  return runApproveStep({
    message: input.message ?? "맞아",
    scopeId: input.scopeId,
    now,
  }).proof;
}

/** 3.2 — Date selected → RESOLVED, PENDING_CONFIRM, no SSOT write. */
export function traceSetCandidateDate(input: {
  patches: Array<{ candidateId: string; date: string }>;
  scopeId?: string;
  now?: Date;
}): CausalProof {
  const now = input.now ?? new Date("2026-06-01T12:00:00");
  return runDateStep({
    patches: input.patches,
    scopeId: input.scopeId,
    now,
  }).proof;
}

/** 3.3 — Confirm → SSOT + projection + unified UI. */
export function traceConfirmCommit(input: {
  message?: string;
  scopeId?: string;
  now?: Date;
  syncClient?: boolean;
}): CausalProof {
  const now = input.now ?? new Date("2026-06-01T12:00:00");
  return runConfirmStep({
    message: input.message ?? "응",
    scopeId: input.scopeId,
    now,
    syncClient: input.syncClient,
  }).proof;
}

/** Legacy adapter for callers expecting EventOsCausalTrace fields. */
export function asLegacyTrace(proof: CausalProof): EventOsCausalTrace {
  return proofToLegacyTrace(proof);
}

export function traceDownstreamPropagation(input: {
  scopeId?: string;
  now?: Date;
}): { ok: boolean; chain: string[]; failures: string[] } {
  const now = input.now ?? new Date();
  const failures: string[] = [];
  const chain: string[] = [];

  const scheduledCount = snapshotEventOsState(
    input.scopeId ?? "default",
    now
  ).scheduledEventCount;
  chain.push(`Event SSOT scheduled count: ${scheduledCount}`);

  invalidateActionProjection();
  chain.push("Action Projection invalidated");

  const projection = composeActionProjection({ now });
  chain.push(`Timeline → Action Projection entries: ${projection.entries.length}`);

  const eventChips = projectEventCalendarChips(listEventCalendarRows(), now);
  chain.push(`Event Calendar chips: ${eventChips.length}`);

  const actionChips = projectActionCalendarChips(projection.entries, now);
  const overlayCount = buildActionCalendar({
    eventChips,
    projectionActionChips: actionChips,
    streamActions: [],
    knowledgeEntities: [],
    now,
  }).rowCount;
  chain.push(`Unified UI overlay rows: ${overlayCount}`);

  if (scheduledCount > 0 && eventChips.length === 0) {
    failures.push("event_calendar_not_updated_from_ssot");
  }
  if (scheduledCount > 0 && overlayCount === 0) {
    failures.push("unified_ui_empty_despite_ssot");
  }

  return { ok: failures.length === 0, chain, failures };
}
