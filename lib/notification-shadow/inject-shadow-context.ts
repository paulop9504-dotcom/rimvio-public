import { compileShadowDashboard } from "@/lib/notification-shadow/compile-dashboard";
import { listShadowRecords } from "@/lib/notification-shadow/shadow-store";
import type { ShadowRouteTier } from "@/lib/notification-shadow/types";

/** Tier 6 inject payload — never terminates the pipeline. */
export type ShadowCandidateWire = {
  shadowId: string;
  ecId?: string;
  label: string;
  summary: string;
  deepLink?: string;
  priority_score: number;
  route: ShadowRouteTier;
  container: string;
};

export type ShadowInjectPayload = {
  candidates: ShadowCandidateWire[];
  promptBlock: string | null;
};

function recordToCandidate(record: ReturnType<typeof listShadowRecords>[number]): ShadowCandidateWire | null {
  const action = record.future_actions[0];
  if (!action?.label && !record.summary) {
    return null;
  }
  return {
    shadowId: record.id,
    ecId: record.ecId,
    label: action?.label ?? record.summary.slice(0, 48),
    summary: record.summary,
    deepLink: action?.deepLink,
    priority_score: record.priority_score,
    route: record.route,
    container: record.container,
  };
}

/**
 * Phase 2 · Tier 6 — inject shadow candidates into resolve context.
 * Does NOT early-return; explicit dashboard queries use T5 deterministic path.
 */
export function injectShadowContext(input?: { maxCandidates?: number }): ShadowInjectPayload {
  const maxCandidates = input?.maxCandidates ?? 5;
  const records = listShadowRecords().filter(
    (record) => record.route !== "drop" && record.future_actions.length > 0
  );

  const ranked = records
    .filter(
      (record) =>
        record.route === "popup" || record.route === "action_stream" || record.route === "shadow"
    )
    .sort((a, b) => b.priority_score - a.priority_score);

  const candidates = ranked
    .slice(0, maxCandidates)
    .map(recordToCandidate)
    .filter((item): item is ShadowCandidateWire => item != null);

  if (candidates.length === 0) {
    return { candidates: [], promptBlock: null };
  }

  const promptBlock = [
    "# Shadow candidates (background context)",
    "Use only when relevant to the user message. Prefer operable main_action — do not dump this list.",
    JSON.stringify({ shadow_candidates: candidates }),
  ].join("\n");

  return { candidates, promptBlock };
}
