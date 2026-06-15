"use client";

import { useCallback, useEffect, useState } from "react";
import {
  LINK_CONTEXT_CHAIN_UPDATED,
  buildLinkHybridLabel,
  clearLinkContextChain,
  readLinkContextChain,
  removeFromLinkContextChain,
  resolveChainedLinks,
  selectLinkContext,
  snapLinkContexts,
  type LinkContextChain,
} from "@/lib/feed/link-context-chain";
import type { LinkRow } from "@/types/database";

export function useLinkContextChain(links: LinkRow[]) {
  const [chain, setChain] = useState<LinkContextChain | null>(null);

  const refresh = useCallback(() => {
    setChain(readLinkContextChain());
  }, []);

  useEffect(() => {
    refresh();
    const onUpdate = () => refresh();
    window.addEventListener(LINK_CONTEXT_CHAIN_UPDATED, onUpdate);
    return () => window.removeEventListener(LINK_CONTEXT_CHAIN_UPDATED, onUpdate);
  }, [refresh]);

  const chainedLinks = resolveChainedLinks(chain, links);
  const hybridLabel = buildLinkHybridLabel(chainedLinks);
  const isHybrid = chainedLinks.length >= 2;

  return {
    chain,
    chainedLinks,
    hybridLabel,
    isHybrid,
    selectLink: (linkId: string) => {
      selectLinkContext(linkId);
      refresh();
    },
    snapTo: (draggedId: string, targetId: string) => {
      snapLinkContexts(draggedId, targetId);
      refresh();
    },
    removeFromChain: (linkId: string) => {
      removeFromLinkContextChain(linkId);
      refresh();
    },
    clearChain: () => {
      clearLinkContextChain();
      refresh();
    },
    refresh,
  };
}
