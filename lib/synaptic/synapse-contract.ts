import type { CapabilityId } from "@/lib/capability-registry/capability-types";

export const SYNAPSE_CONTRACT_VERSION = 1 as const;

/** LTP-like strengthen, LTD-like weaken, growth, prune. */
export type SynapseSignalKind = "expand" | "strengthen" | "weaken" | "prune";

export type SynapseEdge = {
  id: string;
  surfaceId: string;
  capabilityId: CapabilityId;
  /** Connection strength ∈ [-1, 1]. */
  weight: number;
  /** How often this path fired (usage salience). */
  salience: number;
  lastSignal: SynapseSignalKind;
  createdAt: string;
  updatedAt: string;
};

export type SynapseSnapshot = {
  version: typeof SYNAPSE_CONTRACT_VERSION;
  edges: SynapseEdge[];
  updatedAt: string;
};

export type SynapseSignalInput = {
  surfaceId: string;
  capabilityId: CapabilityId;
  kind: SynapseSignalKind;
  at?: string;
  reason?: string;
};

export const EMPTY_SYNAPSE_SNAPSHOT: SynapseSnapshot = {
  version: SYNAPSE_CONTRACT_VERSION,
  edges: [],
  updatedAt: new Date(0).toISOString(),
};
