import type { CapabilityId } from "@/lib/capability-registry/capability-types";
import type { ExecutionRecord } from "@/lib/execution/execution-contract";
import type {
  SynapseEdge,
  SynapseSignalInput,
  SynapseSignalKind,
} from "@/lib/synaptic/synapse-contract";
import { SYNAPSE_CONTRACT_VERSION } from "@/lib/synaptic/synapse-contract";
import {
  readSynapseSnapshot,
  removeSynapseEdge,
  upsertSynapseEdge,
  writeSynapseSnapshot,
} from "@/lib/synaptic/synapse-store";
import { readStabilityControlFlags } from "@/lib/stability/stability-state-store";

export const SYNAPSE_UPDATED_EVENT = "rimvio:synapse-updated" as const;

/** Plasticity constants — aligned with learning layer semantics. */
const PLASTICITY = {
  expand: 0.06,
  strengthen: 0.14,
  weaken: -0.12,
  prune: -0.38,
  minWeight: -1,
  maxWeight: 1,
  pruneCutoff: -0.62,
  decayPerDay: 0.9,
} as const;

function clamp(value: number): number {
  return Math.max(PLASTICITY.minWeight, Math.min(PLASTICITY.maxWeight, Math.round(value * 1000) / 1000));
}

export function buildSynapseId(surfaceId: string, capabilityId: CapabilityId): string {
  return `${surfaceId}:${capabilityId}`;
}

function logSynapse(tag: string, payload: unknown): void {
  if (typeof console !== "undefined") {
    console.debug(`[Rimvio Synapse] ${tag}`, payload);
  }
}

function emitSynapseUpdated(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(SYNAPSE_UPDATED_EVENT));
  }
}

function deltaForKind(kind: SynapseSignalKind): number {
  switch (kind) {
    case "expand":
      return PLASTICITY.expand;
    case "strengthen":
      return PLASTICITY.strengthen;
    case "weaken":
      return PLASTICITY.weaken;
    case "prune":
      return PLASTICITY.prune;
    default:
      return 0;
  }
}

function applyPlasticity(edge: SynapseEdge | null, input: SynapseSignalInput): SynapseEdge | null {
  const at = input.at ?? new Date().toISOString();
  const id = buildSynapseId(input.surfaceId, input.capabilityId);
  const delta = deltaForKind(input.kind);

  if (input.kind === "prune") {
    const nextWeight = clamp((edge?.weight ?? 0) + delta);
    if (nextWeight <= PLASTICITY.pruneCutoff) {
      return null;
    }
    return {
      id,
      surfaceId: input.surfaceId,
      capabilityId: input.capabilityId,
      weight: nextWeight,
      salience: edge?.salience ?? 1,
      lastSignal: "prune",
      createdAt: edge?.createdAt ?? at,
      updatedAt: at,
    };
  }

  const base: SynapseEdge = edge ?? {
    id,
    surfaceId: input.surfaceId,
    capabilityId: input.capabilityId,
    weight: 0,
    salience: 0,
    lastSignal: "expand",
    createdAt: at,
    updatedAt: at,
  };

  const salienceBump = input.kind === "expand" ? 0.5 : 1;
  return {
    ...base,
    weight: clamp(base.weight + delta),
    salience: base.salience + salienceBump,
    lastSignal: input.kind,
    updatedAt: at,
  };
}

/** Write path — apply one synaptic signal (expand / strengthen / weaken / prune). */
export function applySynapticSignal(input: SynapseSignalInput): SynapseEdge | null {
  if (readStabilityControlFlags().learningPaused) {
    return null;
  }

  const id = buildSynapseId(input.surfaceId, input.capabilityId);
  const snapshot = readSynapseSnapshot();
  const existing = snapshot.edges.find((row) => row.id === id) ?? null;
  const next = applyPlasticity(existing, input);

  if (!next) {
    removeSynapseEdge(id);
    logSynapse("SYNAPSE_PRUNED", { id, reason: input.reason ?? input.kind });
    emitSynapseUpdated();
    return null;
  }

  upsertSynapseEdge(next);
  logSynapse("SYNAPSE_PLASTICITY", {
    kind: input.kind,
    id,
    weight: next.weight,
    salience: next.salience,
    reason: input.reason,
  });
  emitSynapseUpdated();
  return next;
}

/** New active surface path — weak excitatory connection (growth). */
export function expandSynapse(input: {
  surfaceId: string;
  capabilityId: CapabilityId;
  reason?: string;
}): SynapseEdge | null {
  return applySynapticSignal({
    ...input,
    kind: "expand",
  });
}

/** Successful use — LTP-like strengthening. */
export function strengthenSynapse(input: {
  surfaceId: string;
  capabilityId: CapabilityId;
  reason?: string;
}): SynapseEdge | null {
  return applySynapticSignal({
    ...input,
    kind: "strengthen",
  });
}

/** Ignore / fail — LTD-like weakening. */
export function weakenSynapse(input: {
  surfaceId: string;
  capabilityId: CapabilityId;
  reason?: string;
}): SynapseEdge | null {
  return applySynapticSignal({
    ...input,
    kind: "weaken",
  });
}

/** Dismiss / suppress — shrink connection, prune if below cutoff. */
export function pruneSynapse(input: {
  surfaceId: string;
  capabilityId: CapabilityId;
  reason?: string;
}): SynapseEdge | null {
  return applySynapticSignal({
    ...input,
    kind: "prune",
  });
}

/** Time decay — unused synapses fade (read path uses snapshot; call on write ticks). */
export function decaySynapses(now: Date = new Date()): void {
  const snapshot = readSynapseSnapshot();
  if (snapshot.edges.length === 0) {
    return;
  }

  const updated: SynapseEdge[] = [];
  for (const edge of snapshot.edges) {
    const ageMs = now.getTime() - Date.parse(edge.updatedAt);
    const days = ageMs <= 0 ? 0 : ageMs / (24 * 60 * 60 * 1000);
    if (days <= 0) {
      updated.push(edge);
      continue;
    }
    const factor = Math.pow(PLASTICITY.decayPerDay, days);
    const weight = clamp(edge.weight * factor);
    if (weight <= PLASTICITY.pruneCutoff) {
      continue;
    }
    updated.push({
      ...edge,
      weight,
      updatedAt: now.toISOString(),
    });
  }

  writeSynapseSnapshot({
    version: SYNAPSE_CONTRACT_VERSION,
    edges: updated,
    updatedAt: now.toISOString(),
  });
  logSynapse("SYNAPSE_DECAY", { remaining: updated.length });
  emitSynapseUpdated();
}

/** Execution + memory bridge. */
export function applySynapticFromExecution(record: ExecutionRecord): void {
  const surfaceId = record.metadata?.surfaceId?.trim();
  if (!surfaceId) {
    return;
  }
  const capabilityId = record.capabilityId;

  if (record.status === "completed") {
    if (capabilityId === "DISMISS_SURFACE") {
      pruneSynapse({ surfaceId, capabilityId, reason: "dismiss_execution" });
      return;
    }
    strengthenSynapse({ surfaceId, capabilityId, reason: "execution_success" });
    return;
  }

  if (record.status === "failed" || record.status === "cancelled") {
    weakenSynapse({ surfaceId, capabilityId, reason: record.status });
  }
}

export function applySynapticFromLearningObservation(input: {
  surfaceId?: string;
  capabilityId: CapabilityId;
  actionType: string;
  resultStatus?: string | null;
}): void {
  const surfaceId = input.surfaceId?.trim();
  if (!surfaceId) {
    return;
  }

  if (input.actionType === "ignore") {
    weakenSynapse({ surfaceId, capabilityId: input.capabilityId, reason: "ignore" });
    return;
  }

  if (input.resultStatus === "success") {
    strengthenSynapse({ surfaceId, capabilityId: input.capabilityId, reason: "learning_success" });
    return;
  }

  if (input.resultStatus === "fail" || input.resultStatus === "cancel") {
    weakenSynapse({ surfaceId, capabilityId: input.capabilityId, reason: input.resultStatus });
  }
}
