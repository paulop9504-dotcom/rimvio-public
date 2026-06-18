import type { CausalProof } from "@/lib/event-os/causal-proof-types";
import { computeRegressionHash } from "@/lib/event-os/graph-versioning/compute-regression-hash";
import type { RegressionResult } from "@/lib/event-os/graph-versioning/graph-versioning-types";
import { getGoldenHash } from "@/lib/event-os/graph-versioning/golden-hash-registry";
import { inferScenarioId } from "@/lib/event-os/graph-versioning/infer-scenario-id";

function regressionDiffFields(
  proof: CausalProof,
  golden: { expectedHash: string; proofHash?: string }
): string[] {
  const actual = computeRegressionHash(proof);
  const fields: string[] = [];

  if (actual !== golden.expectedHash) {
    fields.push("regressionHash");
  }
  if (golden.proofHash && proof.proofHash !== golden.proofHash) {
    fields.push("proofHash");
  }

  return fields;
}

/** Compare proof against golden registry — regression detection engine. */
export function detectRegression(
  proof: CausalProof,
  scenarioId?: string | null
): RegressionResult {
  const resolvedScenario = scenarioId ?? inferScenarioId(proof);
  const actual = computeRegressionHash(proof);

  if (!resolvedScenario) {
    return {
      isRegression: false,
      scenarioId: null,
      diffFields: [],
      expected: null,
      actual,
      proofHash: proof.proofHash,
    };
  }

  const golden = getGoldenHash(resolvedScenario);
  if (!golden) {
    return {
      isRegression: false,
      scenarioId: resolvedScenario,
      diffFields: ["golden_entry_missing"],
      expected: null,
      actual,
      proofHash: proof.proofHash,
    };
  }

  const diffFields = regressionDiffFields(proof, golden);
  const isRegression = diffFields.length > 0;

  return {
    isRegression,
    scenarioId: resolvedScenario,
    diffFields,
    expected: golden.expectedHash,
    actual,
    proofHash: proof.proofHash,
  };
}
