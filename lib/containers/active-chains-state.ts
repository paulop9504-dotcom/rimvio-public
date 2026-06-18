/**
 * State Manager (Frontend)
 * activeChains = ["bitcoin_trader", "news_briefing"]
 */

import {
  buildHybridLabelFromKeys,
  normalizeActiveChains,
  normalizeContainerKey,
  type CanonicalContainerKey,
} from "@/lib/containers/container-types";

export const ACTIVE_CHAINS_STORAGE_KEY = "rimvio.active-chains.v1";
export const ACTIVE_CHAINS_UPDATED = "rimvio-active-chains-updated";

/** Legacy chain storage — migrated on read */
const LEGACY_CHAIN_KEY = "rimvio.container-chain.v1";

export function readActiveChains(): CanonicalContainerKey[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = localStorage.getItem(ACTIVE_CHAINS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        return normalizeActiveChains(parsed.filter((id): id is string => typeof id === "string"));
      }
    }

    const legacy = localStorage.getItem(LEGACY_CHAIN_KEY);
    if (legacy) {
      const parsed = JSON.parse(legacy) as { containerIds?: string[] };
      if (Array.isArray(parsed.containerIds) && parsed.containerIds.length > 0) {
        const migrated = normalizeActiveChains(parsed.containerIds);
        writeActiveChains(migrated);
        localStorage.removeItem(LEGACY_CHAIN_KEY);
        return migrated;
      }
    }
  } catch {
    // ignore
  }

  return [];
}

export function writeActiveChains(activeChains: CanonicalContainerKey[]) {
  if (typeof window === "undefined") {
    return activeChains;
  }

  try {
    if (activeChains.length === 0) {
      localStorage.removeItem(ACTIVE_CHAINS_STORAGE_KEY);
    } else {
      localStorage.setItem(ACTIVE_CHAINS_STORAGE_KEY, JSON.stringify(activeChains));
    }
    window.dispatchEvent(new CustomEvent(ACTIVE_CHAINS_UPDATED));
  } catch {
    // ignore
  }

  return activeChains;
}

export function clearActiveChains() {
  return writeActiveChains([]);
}

export function selectActiveChain(key: string) {
  const normalized = normalizeContainerKey(key);
  if (!normalized) {
    return readActiveChains();
  }
  return writeActiveChains([normalized]);
}

/** Dragged container gets priority (first in array). */
export function snapActiveChains(draggedKey: string, targetKey: string) {
  const dragged = normalizeContainerKey(draggedKey);
  const target = normalizeContainerKey(targetKey);
  if (!dragged || !target || dragged === target) {
    return readActiveChains();
  }

  const existing = readActiveChains();
  const rest = existing.filter((key) => key !== dragged && key !== target);
  return writeActiveChains([dragged, target, ...rest]);
}

export function removeFromActiveChains(key: string) {
  const normalized = normalizeContainerKey(key);
  if (!normalized) {
    return readActiveChains();
  }

  const next = readActiveChains().filter((item) => item !== normalized);
  if (next.length === 0) {
    return clearActiveChains();
  }
  return writeActiveChains(next);
}

export function readActiveChainsHybridLabel() {
  return buildHybridLabelFromKeys(readActiveChains());
}

export function isActiveChainHybrid() {
  return readActiveChains().length >= 2;
}

/** For orchestrator context compatibility */
export function readActiveChainsAsLegacyChain() {
  const keys = readActiveChains();
  if (keys.length === 0) {
    return null;
  }
  return {
    containerIds: keys,
    mergedAt: new Date().toISOString(),
  };
}

export function resetActiveChainsForTests(keys: CanonicalContainerKey[] = []) {
  if (typeof window === "undefined") {
    return keys;
  }
  return writeActiveChains(keys);
}
