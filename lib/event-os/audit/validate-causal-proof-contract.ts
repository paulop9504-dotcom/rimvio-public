import type { CausalProof } from "@/lib/event-os/causal-proof-types";
import { CAUSAL_PROOF_VERSION } from "@/lib/event-os/causal-proof-types";

const REQUIRED_TOP_LEVEL: Array<keyof CausalProof> = [
  "proofVersion",
  "input",
  "plan",
  "execution",
  "stateBefore",
  "stateAfter",
  "stateDiff",
  "validationProof",
  "commitDecision",
  "ssotDelta",
  "projectionDelta",
  "uiDiff",
  "causalChain",
  "relationGraph",
  "proofHash",
  "anomalies",
];

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** trace ≠ log — must be full CausalProof execution contract. */
export function validateCausalProofContract(
  proof: unknown,
  label: string
): string[] {
  const failures: string[] = [];

  if (!isPlainObject(proof)) {
    failures.push(`${label}:not_object`);
    return failures;
  }

  const logLike =
    "message" in proof ||
    ("level" in proof && !("proofHash" in proof)) ||
    ("timestamp" in proof && !("proofVersion" in proof));
  if (logLike) {
    failures.push(`${label}:log_shape_not_proof`);
  }

  for (const key of REQUIRED_TOP_LEVEL) {
    if (!(key in proof)) {
      failures.push(`${label}:missing_${key}`);
    }
  }

  const p = proof as CausalProof;
  if (p.proofVersion !== CAUSAL_PROOF_VERSION) {
    failures.push(`${label}:proof_version_${String(p.proofVersion)}`);
  }

  if (!p.proofHash || p.proofHash.length !== 64) {
    failures.push(`${label}:invalid_proof_hash`);
  }

  if (!Array.isArray(p.causalChain) || p.causalChain.length === 0) {
    failures.push(`${label}:causal_chain_empty`);
  }

  if (!p.relationGraph?.nodes?.length || !p.relationGraph?.edges?.length) {
    failures.push(`${label}:relation_graph_incomplete`);
  }

  if (!p.input?.step || !p.input?.scopeId) {
    failures.push(`${label}:input_incomplete`);
  }

  if (!p.plan?.triggeredFunction || !Array.isArray(p.plan?.triggeredChain)) {
    failures.push(`${label}:plan_incomplete`);
  }

  if (typeof p.execution?.dryRun !== "boolean") {
    failures.push(`${label}:execution_dry_run_missing`);
  }

  if (!p.validationProof?.result) {
    failures.push(`${label}:validation_proof_missing`);
  }

  const uiDiffValues = [
    "none",
    "show DATE_PICKER",
    "show CONFIRM_SCREEN",
    "calendar_update + action_overlay",
  ] as const;
  if (!uiDiffValues.includes(p.uiDiff as (typeof uiDiffValues)[number])) {
    failures.push(`${label}:ui_diff_invalid`);
  }

  return failures;
}
