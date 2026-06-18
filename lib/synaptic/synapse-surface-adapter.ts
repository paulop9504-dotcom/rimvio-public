import type { CapabilityId } from "@/lib/capability-registry/capability-types";
import { buildSynapseId } from "@/lib/synaptic/synapse-engine";
import { readSynapseSnapshot } from "@/lib/synaptic/synapse-store";

const WEIGHT_TO_PRIORITY = 14;

/**
 * Read-only boost for Surface Engine — synaptic strength → priority score.
 */
export function getSynapticPriorityBoost(
  surfaceId: string,
  capabilityId: CapabilityId,
): number {
  const id = buildSynapseId(surfaceId, capabilityId);
  const edge = readSynapseSnapshot().edges.find((row) => row.id === id);
  if (!edge) {
    return 0;
  }
  const salienceFactor = Math.min(1.4, 1 + edge.salience * 0.02);
  return Math.round(edge.weight * WEIGHT_TO_PRIORITY * salienceFactor * 10) / 10;
}

export function listStrongSynapses(minWeight = 0.2) {
  return readSynapseSnapshot().edges.filter((row) => row.weight >= minWeight);
}

export function listWeakSynapses(maxWeight = -0.2) {
  return readSynapseSnapshot().edges.filter((row) => row.weight <= maxWeight);
}
