import type { GoldenHashRegistry } from "@/lib/event-os/graph-versioning/graph-versioning-types";

/**
 * Golden hash registry (v1 baseline graph).
 * expectedHash = regression fingerprint; proofHash = full CausalProof hash.
 * Refresh: npx tsx scripts/record-event-os-golden-hashes.ts
 */
export const GOLDEN_HASH_REGISTRY_V1: GoldenHashRegistry = {
  ocr_approve_missing_date: {
    scenarioId: "ocr_approve_missing_date",
    expectedHash:
      "494661618aae5d3a7b8f8be73c6df22d9650e16e34df2b5739fbff0050d8267f",
    proofHash:
      "1b818f3594023c70ab4b87f22599fc6fb6fc3660d6d25be50a539f9ef9e21e32",
    description: "맞아 with MISSING_DATE → BLOCKED + DATE_PICKER",
    createdAt: "2026-06-01T10:34:34.988Z",
    graphVersion: "v1",
  },
  ocr_date_resolved: {
    scenarioId: "ocr_date_resolved",
    expectedHash:
      "b0e167476cff8a0509631d6dc5b9aac56cac4d1292d04cf44006c0f4fc8f9eb7",
    proofHash:
      "afaafd48cf11cdd3a1d2ebb0d4d5ab4562ed9b5a6cb8c84ab2fea7bf1f942a26",
    description: "Date patch → PENDING_CONFIRM, no SSOT",
    createdAt: "2026-06-01T10:34:34.988Z",
    graphVersion: "v1",
  },
  ocr_confirm_executed: {
    scenarioId: "ocr_confirm_executed",
    expectedHash:
      "a81d19b663b40032afc4ec7f881de2f800e7f3e27e155ca73a5adc270a6a30c4",
    proofHash:
      "e865a4316ea88f27f3931c6adbfd7b324d3acceb09cf2bdf4de88024e9651210",
    description: "Confirm after dates → EXECUTED + overlay",
    createdAt: "2026-06-01T10:34:34.988Z",
    graphVersion: "v1",
  },
};

export function getGoldenHash(scenarioId: string) {
  return GOLDEN_HASH_REGISTRY_V1[scenarioId];
}
