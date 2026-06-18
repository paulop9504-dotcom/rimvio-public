"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ACTIVE_CHAINS_UPDATED,
  readActiveChains,
  readActiveChainsHybridLabel,
  clearActiveChains,
  removeFromActiveChains,
  selectActiveChain,
  snapActiveChains,
} from "@/lib/containers/active-chains-state";
import {
  buildHybridLabelFromKeys,
  type CanonicalContainerKey,
} from "@/lib/containers/container-types";
import {
  CONTEXT_CONTAINERS_UPDATED,
  readContextContainers,
  type ContextContainer,
} from "@/lib/containers/context-containers";

export function useContainerChain() {
  const [containers, setContainers] = useState<ContextContainer[]>([]);
  const [activeChains, setActiveChains] = useState<CanonicalContainerKey[]>([]);

  const refresh = useCallback(() => {
    setContainers(readContextContainers());
    setActiveChains(readActiveChains());
  }, []);

  useEffect(() => {
    refresh();

    const onChain = () => refresh();
    const onContainers = () => refresh();

    window.addEventListener(ACTIVE_CHAINS_UPDATED, onChain);
    window.addEventListener(CONTEXT_CONTAINERS_UPDATED, onContainers);

    return () => {
      window.removeEventListener(ACTIVE_CHAINS_UPDATED, onChain);
      window.removeEventListener(CONTEXT_CONTAINERS_UPDATED, onContainers);
    };
  }, [refresh]);

  const hybridLabel = buildHybridLabelFromKeys(activeChains);
  const isHybrid = activeChains.length >= 2;

  return {
    containers,
    /** State Manager: ["bitcoin_trader", "news_briefing"] */
    activeChains,
    hybridLabel,
    isHybrid,
    selectContainer: (id: string) => {
      selectActiveChain(id);
      refresh();
    },
    snapTo: (draggedId: string, targetId: string) => {
      snapActiveChains(draggedId, targetId);
      refresh();
    },
    removeFromChain: (id: string) => {
      removeFromActiveChains(id);
      refresh();
    },
    clearChain: () => {
      clearActiveChains();
      refresh();
    },
    refresh,
  };
}

export function readActiveChainsLabel() {
  return readActiveChainsHybridLabel();
}
