import type { SynapseEdge, SynapticSnapshot } from "@/lib/synaptic/synaptic-contract";
import {
  EMPTY_SYNAPTIC_SNAPSHOT,
  SYNAPTIC_CONTRACT_VERSION,
} from "@/lib/synaptic/synaptic-contract";

const STORAGE_KEY = "rimvio.synaptic.v1";
const MAX_EDGES = 256;

let cache: SynapticSnapshot | null = null;

function clone(snapshot: SynapticSnapshot): SynapticSnapshot {
  return {
    version: snapshot.version,
    updatedAt: snapshot.updatedAt,
    edges: snapshot.edges.map((row) => ({
      ...row,
      from: { ...row.from },
      to: { ...row.to },
    })),
  };
}

function readStorage(): SynapticSnapshot | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as SynapticSnapshot;
    if (parsed.version !== SYNAPTIC_CONTRACT_VERSION) {
      return null;
    }
    return {
      version: SYNAPTIC_CONTRACT_VERSION,
      edges: [...(parsed.edges ?? [])],
      updatedAt: parsed.updatedAt ?? new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

function writeStorage(snapshot: SynapticSnapshot): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
}

export function readSynapticSnapshot(): SynapticSnapshot {
  if (cache) {
    return clone(cache);
  }
  const stored = readStorage();
  if (stored) {
    cache = stored;
    return clone(stored);
  }
  return clone(EMPTY_SYNAPTIC_SNAPSHOT);
}

export function writeSynapticSnapshot(snapshot: SynapticSnapshot): SynapticSnapshot {
  const sorted = [...snapshot.edges].sort((a, b) => b.weight - a.weight).slice(0, MAX_EDGES);
  const next: SynapticSnapshot = {
    version: SYNAPTIC_CONTRACT_VERSION,
    edges: sorted,
    updatedAt: snapshot.updatedAt,
  };
  cache = next;
  writeStorage(next);
  return clone(next);
}

export function upsertSynapticEdge(edge: SynapseEdge): SynapticSnapshot {
  const current = readSynapticSnapshot();
  const index = current.edges.findIndex((row) => row.id === edge.id);
  const edges =
    index === -1
      ? [...current.edges, edge]
      : current.edges.map((row, i) => (i === index ? edge : row));
  return writeSynapticSnapshot({
    version: SYNAPTIC_CONTRACT_VERSION,
    edges,
    updatedAt: edge.lastActivatedAt,
  });
}

export function resetSynapticStoreForTests(): void {
  cache = null;
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(STORAGE_KEY);
  }
}
