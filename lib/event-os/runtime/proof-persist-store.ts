import type { CausalProof } from "@/lib/event-os/causal-proof-types";
import type { ExecutionGraphEntry } from "@/lib/event-os/runtime/event-os-runtime-types";

const proofsByHash = new Map<string, CausalProof>();
const graphByScope = new Map<string, ExecutionGraphEntry[]>();

export function persistProof(proof: CausalProof, graphEntry?: ExecutionGraphEntry): void {
  proofsByHash.set(proof.proofHash, proof);
  if (graphEntry) {
    const prior = graphByScope.get(graphEntry.scopeId) ?? [];
    graphByScope.set(graphEntry.scopeId, [...prior, graphEntry]);
  }
}

export function getProofByHash(hash: string): CausalProof | undefined {
  return proofsByHash.get(hash);
}

export function getExecutionGraph(scopeId: string): readonly ExecutionGraphEntry[] {
  return graphByScope.get(scopeId) ?? [];
}

export function listPersistedProofHashes(scopeId?: string): string[] {
  const hashes: string[] = [];
  for (const proof of proofsByHash.values()) {
    if (!scopeId || proof.input.scopeId === scopeId) {
      hashes.push(proof.proofHash);
    }
  }
  return hashes;
}

export function resetProofPersistStoreForTests(): void {
  proofsByHash.clear();
  graphByScope.clear();
}
