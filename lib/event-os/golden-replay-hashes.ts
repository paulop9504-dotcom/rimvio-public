import type { CausalProofStep } from "@/lib/event-os/causal-proof-types";
import { GOLDEN_HASH_REGISTRY_V1 } from "@/lib/event-os/graph-versioning/golden-hash-registry";

/** @deprecated Use GOLDEN_HASH_REGISTRY_V1 — kept for replay tests. */
export type GoldenReplayEntry = {
  id: string;
  step: CausalProofStep;
  proofHash: string;
  description: string;
};

export const GOLDEN_REPLAY_HASHES_V1: GoldenReplayEntry[] = Object.values(
  GOLDEN_HASH_REGISTRY_V1
).map((entry) => ({
  id: entry.scenarioId,
  step:
    entry.scenarioId === "ocr_approve_missing_date"
      ? "approve"
      : entry.scenarioId === "ocr_date_resolved"
        ? "date"
        : "confirm",
  proofHash: entry.proofHash ?? "",
  description: entry.description,
}));

export function findGoldenHash(id: string): string | undefined {
  const entry = GOLDEN_HASH_REGISTRY_V1[id];
  return entry?.proofHash ?? entry?.expectedHash;
}

export function findGoldenRegressionHash(id: string): string | undefined {
  return GOLDEN_HASH_REGISTRY_V1[id]?.expectedHash;
}
