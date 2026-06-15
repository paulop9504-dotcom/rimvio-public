import type { SynapseEdge, SynapseSnapshot } from "@/lib/synaptic/synapse-contract";
import {
  EMPTY_SYNAPSE_SNAPSHOT,
  SYNAPSE_CONTRACT_VERSION,
} from "@/lib/synaptic/synapse-contract";

const STORAGE_KEY = "rimvio.synaptic-edges.v1";
const MAX_EDGES = 128;

let cache: SynapseSnapshot | null = null;

function clone(snapshot: SynapseSnapshot): SynapseSnapshot {
  return {
    version: snapshot.version,
    edges: snapshot.edges.map((row) => ({ ...row })),
    updatedAt: snapshot.updatedAt,
  };
}

function readStorage(): SynapseSnapshot | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as SynapseSnapshot;
    if (parsed.version !== SYNAPSE_CONTRACT_VERSION) {
      return null;
    }
    return {
      version: SYNAPSE_CONTRACT_VERSION,
      edges: [...(parsed.edges ?? [])],
      updatedAt: parsed.updatedAt ?? new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

function writeStorage(snapshot: SynapseSnapshot): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
}

export function readSynapseSnapshot(): SynapseSnapshot {
  if (cache) {
    return clone(cache);
  }
  const stored = readStorage();
  if (stored) {
    cache = stored;
    return clone(stored);
  }
  return clone(EMPTY_SYNAPSE_SNAPSHOT);
}

export function writeSynapseSnapshot(snapshot: SynapseSnapshot): SynapseSnapshot {
  const sorted = [...snapshot.edges]
    .sort((a, b) => b.salience - a.salience || b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, MAX_EDGES);
  const next: SynapseSnapshot = {
    version: SYNAPSE_CONTRACT_VERSION,
    edges: sorted,
    updatedAt: snapshot.updatedAt,
  };
  cache = next;
  writeStorage(next);
  return clone(next);
}

export function upsertSynapseEdge(edge: SynapseEdge): SynapseSnapshot {
  const current = readSynapseSnapshot();
  const map = new Map(current.edges.map((row) => [row.id, row]));
  map.set(edge.id, edge);
  return writeSynapseSnapshot({
    version: SYNAPSE_CONTRACT_VERSION,
    edges: [...map.values()],
    updatedAt: edge.updatedAt,
  });
}

export function removeSynapseEdge(edgeId: string): SynapseSnapshot {
  const current = readSynapseSnapshot();
  return writeSynapseSnapshot({
    version: SYNAPSE_CONTRACT_VERSION,
    edges: current.edges.filter((row) => row.id !== edgeId),
    updatedAt: new Date().toISOString(),
  });
}

export function resetSynapseStoreForTests(): void {
  cache = null;
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(STORAGE_KEY);
  }
}
