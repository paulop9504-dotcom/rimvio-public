import { getDisplayTitleForLink } from "@/lib/feed/sanitize-link-title";
import type { LinkRow } from "@/types/database";

export const LINK_CONTEXT_CHAIN_KEY = "rimvio.link-context-chain.v1";
export const LINK_CONTEXT_CHAIN_UPDATED = "rimvio-link-context-chain-updated";

export type LinkContextChain = {
  linkIds: string[];
  mergedAt: string;
};

export function readLinkContextChain(): LinkContextChain | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = localStorage.getItem(LINK_CONTEXT_CHAIN_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<LinkContextChain>;
    const linkIds = Array.isArray(parsed.linkIds)
      ? parsed.linkIds.filter((id): id is string => typeof id === "string")
      : [];

    if (linkIds.length === 0) {
      return null;
    }

    return {
      linkIds,
      mergedAt:
        typeof parsed.mergedAt === "string"
          ? parsed.mergedAt
          : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function writeLinkContextChain(chain: LinkContextChain | null) {
  if (typeof window === "undefined") {
    return chain;
  }

  try {
    if (!chain || chain.linkIds.length === 0) {
      localStorage.removeItem(LINK_CONTEXT_CHAIN_KEY);
    } else {
      localStorage.setItem(LINK_CONTEXT_CHAIN_KEY, JSON.stringify(chain));
    }
    window.dispatchEvent(new CustomEvent(LINK_CONTEXT_CHAIN_UPDATED));
  } catch {
    // ignore
  }

  return chain;
}

export function clearLinkContextChain() {
  return writeLinkContextChain(null);
}

export function selectLinkContext(linkId: string) {
  return writeLinkContextChain({
    linkIds: [linkId],
    mergedAt: new Date().toISOString(),
  });
}

/** Dragged link gets priority (matches container chain behavior). */
export function snapLinkContexts(draggedId: string, targetId: string) {
  if (draggedId === targetId) {
    return readLinkContextChain();
  }

  const existing = readLinkContextChain()?.linkIds ?? [];
  const rest = existing.filter((id) => id !== draggedId && id !== targetId);
  return writeLinkContextChain({
    linkIds: [draggedId, targetId, ...rest],
    mergedAt: new Date().toISOString(),
  });
}

export function removeFromLinkContextChain(linkId: string) {
  const existing = readLinkContextChain();
  if (!existing) {
    return null;
  }

  const nextIds = existing.linkIds.filter((id) => id !== linkId);
  if (nextIds.length === 0) {
    return clearLinkContextChain();
  }

  return writeLinkContextChain({
    linkIds: nextIds,
    mergedAt: new Date().toISOString(),
  });
}

export function resolveChainedLinks(
  chain: LinkContextChain | null,
  links: LinkRow[]
): LinkRow[] {
  if (!chain) {
    return [];
  }

  const byId = new Map(links.map((link) => [link.id, link]));
  return chain.linkIds
    .map((id) => byId.get(id))
    .filter((link): link is LinkRow => Boolean(link));
}

export function buildLinkHybridLabel(links: LinkRow[]): string {
  if (links.length === 0) {
    return "";
  }

  if (links.length === 1) {
    return getDisplayTitleForLink(links[0]!) ?? links[0]!.title;
  }

  return links
    .map((link) => getDisplayTitleForLink(link) ?? link.title)
    .map((title) => title.slice(0, 12))
    .join(" × ");
}

export function buildLinkedLinksWire(links: LinkRow[]) {
  return links.map((link) => ({
    id: link.id,
    title: getDisplayTitleForLink(link),
    url: link.original_url ?? null,
    category: link.category ?? null,
  }));
}
