import { createHash } from "node:crypto";
import type { CausalProof } from "@/lib/event-os/causal-proof-types";

function stableStringify(value: unknown): string {
  return JSON.stringify(value, (_key, v) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.keys(v as Record<string, unknown>)
          .sort()
          .reduce<Record<string, unknown>>((acc, key) => {
            acc[key] = (v as Record<string, unknown>)[key];
            return acc;
          }, {})
      : v
  );
}

/** Golden / regression fingerprint — subset of proof fields (deterministic). */
export function computeRegressionHash(proof: CausalProof): string {
  const body = {
    input: {
      action: proof.input.action,
      step: proof.input.step,
      scopeId: proof.input.scopeId,
      patches: proof.input.patches,
      syncClient: proof.input.syncClient,
    },
    causalChain: proof.causalChain,
    stateDiff: proof.stateDiff,
    uiDiff: proof.uiDiff,
    validationResult: proof.validationProof.result,
    ssotDelta: {
      before: proof.ssotDelta.before,
      after: proof.ssotDelta.after,
      delta: proof.ssotDelta.delta,
      changed: proof.ssotDelta.changed,
    },
    commitDecision: proof.commitDecision,
  };
  return createHash("sha256").update(stableStringify(body)).digest("hex");
}

export function hashGraphSnapshot(graph: {
  version: string;
  scopeId: string;
  rootId: string;
  nodes: Array<{ id: string; causalProofHash: string }>;
  edges: Array<{ from: string; to: string; relation: string }>;
  headProofHash: string;
}): string {
  return createHash("sha256").update(stableStringify(graph)).digest("hex");
}
