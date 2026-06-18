import type { CrossLinkPattern, SaveTrajectoryEntry } from "@/lib/intent/kernel-types";

const DAY_MS = 24 * 60 * 60 * 1000;

function tokenize(text: string) {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter((token) => token.length >= 2)
  );
}

function jaccard(a: Set<string>, b: Set<string>) {
  if (a.size === 0 || b.size === 0) {
    return 0;
  }

  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) {
      intersection += 1;
    }
  }

  const union = a.size + b.size - intersection;
  return union > 0 ? intersection / union : 0;
}

export function analyzeCrossLinkMemory(input: {
  current: {
    category?: string | null;
    domain?: string | null;
    title?: string | null;
    query?: string | null;
  };
  saveHistory: SaveTrajectoryEntry[];
  now?: number;
}): {
  related_count: number;
  pattern: CrossLinkPattern;
  signals: Array<{ id: string; delta: number }>;
} {
  const now = input.now ?? Date.now();
  const peers = input.saveHistory.filter(
    (entry) => now - new Date(entry.timestamp).getTime() <= DAY_MS
  );

  if (peers.length === 0) {
    return { related_count: 0, pattern: "none", signals: [] };
  }

  const currentTitle = `${input.current.title ?? ""} ${input.current.query ?? ""}`.trim();
  const currentTokens = tokenize(currentTitle);
  const currentCategory = (input.current.category ?? "").toLowerCase();
  const currentDomain = input.current.domain ?? "";

  let related = 0;
  let sameDomain = 0;
  let sameCategory = 0;
  let similarTitle = 0;

  for (const peer of peers) {
    let matched = false;

    if (currentDomain && peer.domain && currentDomain === peer.domain) {
      sameDomain += 1;
      matched = true;
    }

    if (
      currentCategory &&
      peer.category &&
      currentCategory === peer.category.toLowerCase()
    ) {
      sameCategory += 1;
      matched = true;
    }

    const peerTitle = `${peer.title ?? ""} ${peer.query ?? ""}`.trim();
    if (jaccard(currentTokens, tokenize(peerTitle)) >= 0.35) {
      similarTitle += 1;
      matched = true;
    }

    if (matched) {
      related += 1;
    }
  }

  let pattern: CrossLinkPattern = "none";
  const signals: Array<{ id: string; delta: number }> = [];

  if (sameDomain >= 2 || (sameDomain >= 1 && sameCategory >= 1)) {
    pattern = "comparison";
    signals.push({ id: "cross_link_comparison", delta: 10 });
  } else if (similarTitle >= 1 && sameCategory >= 1) {
    pattern = "workflow";
    signals.push({ id: "cross_link_workflow", delta: 8 });
  } else if (related >= 1) {
    pattern = "repeat";
    signals.push({ id: "cross_link_repeat", delta: 6 });
  }

  return { related_count: related, pattern, signals };
}
