import {
  clearActiveChains,
  readActiveChains,
  readActiveChainsAsLegacyChain,
  removeFromActiveChains,
  selectActiveChain,
  snapActiveChains,
  writeActiveChains,
} from "@/lib/containers/active-chains-state";
import {
  buildHybridLabelFromKeys,
  mergeActiveChainsPersona,
  normalizeContainerKey,
  resolveCanonicalPreset,
  unionCapabilities,
  type ActiveChainWire,
  type CanonicalContainerKey,
} from "@/lib/containers/container-types";
import { buildActiveChainsWireFromKeys } from "@/lib/containers/context-generator";
import type { ContextContainer } from "@/lib/containers/context-containers";

export const ACTIVE_CHAIN_KEY = "rimvio.container-chain.v1";
export const ACTIVE_CHAIN_UPDATED = "rimvio-active-chains-updated";

export type ActiveContainerChain = {
  containerIds: string[];
  mergedAt: string;
};

export function readActiveContainerChain(): ActiveContainerChain | null {
  return readActiveChainsAsLegacyChain();
}

export function writeActiveContainerChain(chain: ActiveContainerChain | null) {
  if (!chain?.containerIds.length) {
    clearActiveChains();
    return null;
  }
  writeActiveChains(
    chain.containerIds
      .map((id) => normalizeContainerKey(id))
      .filter((key): key is CanonicalContainerKey => Boolean(key))
  );
  return readActiveContainerChain();
}

export function clearActiveContainerChain() {
  return clearActiveChains();
}

export function setActiveContainer(containerId: string) {
  selectActiveChain(containerId);
  return readActiveContainerChain();
}

export function snapContainers(draggedId: string, targetId: string) {
  snapActiveChains(draggedId, targetId);
  return readActiveContainerChain();
}

export function removeFromActiveChain(containerId: string) {
  removeFromActiveChains(containerId);
  return readActiveContainerChain();
}

export function resolveContainerPreset(id: string) {
  const key = normalizeContainerKey(id);
  return key ? resolveCanonicalPreset(key) : null;
}

export function resolveContainerPersona(container: ContextContainer): string {
  if (container.persona?.trim()) {
    return container.persona.trim();
  }
  const key = normalizeContainerKey(container.id);
  return key ? resolveCanonicalPreset(key).persona : `${container.title} 맥락`;
}

export function resolveContainerAllowedActions(container: ContextContainer) {
  if (container.allowedActions?.length) {
    return container.allowedActions;
  }
  const key = normalizeContainerKey(container.id);
  return key ? resolveCanonicalPreset(key).allowedActions : (["ACTION"] as const);
}

export function mergeChainPersona(containers: ContextContainer[]): string {
  const keys = containers
    .map((item) => normalizeContainerKey(item.id))
    .filter((key): key is CanonicalContainerKey => Boolean(key));
  return mergeActiveChainsPersona(keys);
}

export function unionAllowedActions(containers: ContextContainer[]) {
  const keys = containers
    .map((item) => normalizeContainerKey(item.id))
    .filter((key): key is CanonicalContainerKey => Boolean(key));
  return unionCapabilities(keys);
}

export function buildHybridLabel(containers: ContextContainer[]): string {
  const keys = containers
    .map((item) => normalizeContainerKey(item.id))
    .filter((key): key is CanonicalContainerKey => Boolean(key));
  return buildHybridLabelFromKeys(keys);
}

export function resolveChainContainers(
  chain: ActiveContainerChain | null,
  allContainers: ContextContainer[]
): ContextContainer[] {
  if (!chain) {
    return [];
  }

  const byId = new Map(allContainers.map((item) => [item.id, item]));
  const byKey = new Map(
    allContainers
      .map((item) => {
        const key = normalizeContainerKey(item.id);
        return key ? ([key, item] as const) : null;
      })
      .filter((entry): entry is readonly [CanonicalContainerKey, ContextContainer] =>
        Boolean(entry)
      )
  );

  return chain.containerIds
    .map((id) => byId.get(id) ?? (normalizeContainerKey(id) ? byKey.get(normalizeContainerKey(id)!) : undefined))
    .filter((item): item is ContextContainer => Boolean(item));
}

export function buildActiveChainsWire(input: {
  chain: ActiveContainerChain | null;
  containers: ContextContainer[];
}): ActiveChainWire[] {
  if (!input.chain?.containerIds.length) {
    return [];
  }
  return buildActiveChainsWireFromKeys(input.chain.containerIds);
}

export { readActiveChains, snapActiveChains, writeActiveChains, clearActiveChains };
