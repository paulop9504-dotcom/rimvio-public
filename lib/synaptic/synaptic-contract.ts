import type { CapabilityId } from "@/lib/capability-registry/capability-types";

export const SYNAPTIC_CONTRACT_VERSION = 1 as const;

export const SYNAPTIC_UPDATED_EVENT = "rimvio:synaptic-updated" as const;

/** Node in the Rimvio association graph (not a UI node). */
export type SynapseNodeKind =
  | "capability"
  | "surface_type"
  | "surface"
  | "context"
  | "loop";

export type SynapseNodeRef = {
  kind: SynapseNodeKind;
  id: string;
};

export type SynapseEdge = {
  id: string;
  from: SynapseNodeRef;
  to: SynapseNodeRef;
  /** Connection strength [0, 1] — Hebbian reinforcement. */
  weight: number;
  /** Times this pathway was activated. */
  activations: number;
  /** Plasticity headroom — new edges start higher, mature edges change slower. */
  plasticity: number;
  lastActivatedAt: string;
  createdAt: string;
};

export type SynapticSnapshot = {
  version: typeof SYNAPTIC_CONTRACT_VERSION;
  edges: SynapseEdge[];
  updatedAt: string;
};

export const EMPTY_SYNAPTIC_SNAPSHOT: SynapticSnapshot = {
  version: SYNAPTIC_CONTRACT_VERSION,
  edges: [],
  updatedAt: new Date(0).toISOString(),
};

export type SynapticReinforceKind =
  | "co_activation"
  | "execution_success"
  | "execution_fail"
  | "ignore"
  | "dismiss"
  | "memory_complete";

export type SynapticReinforceInput = {
  kind: SynapticReinforceKind;
  from: SynapseNodeRef;
  to: SynapseNodeRef;
  delta?: number;
  at?: string;
  capabilityId?: CapabilityId;
  surfaceType?: string;
};
