import { peerDisplayNamesMatch } from "@/lib/peer-chat/match-peer-display-name";
import type {
  FeedSlotPeerContext,
  FeedSlotPeerLookup,
  FeedSlotPeerLookupRow,
} from "@/lib/feed/feed-slot-peer-context-types";
import type { FeedTodaySlot } from "@/lib/feed/feed-today-slot-types";
import type { PlanContext } from "@/lib/plan-context/plan-context-types";

const MAX_PEER_CHIPS = 3;

const NAME_HINT_PATTERNS = [
  /@([가-힣a-zA-Z][가-힣a-zA-Z0-9_]{1,14})/gu,
  /([가-힣a-zA-Z][가-힣a-zA-Z0-9_]{1,10})(?:이랑|랑|와|과|님이랑|님과|님이)/gu,
] as const;

function collectSlotText(slot: FeedTodaySlot): string {
  if (slot.kind === "surface") {
    return [
      slot.surface.description,
      slot.surface.title,
      slot.surface.narration?.summary,
      ...slot.surface.people.map((row) => row.displayName),
    ]
      .filter(Boolean)
      .join(" ");
  }

  const row = slot.row;
  return [
    row.prompt_hint,
    row.context_lines?.join(" "),
    row.event.title,
    row.event.entry?.title,
    row.event.entry?.subtitle,
  ]
    .filter(Boolean)
    .join(" ");
}

function extractNameHints(text: string): string[] {
  const hints = new Set<string>();
  for (const pattern of NAME_HINT_PATTERNS) {
    for (const match of text.matchAll(pattern)) {
      const name = match[1]?.trim();
      if (name && name.length >= 2) {
        hints.add(name);
      }
    }
  }
  return [...hints];
}

function findPeerRow(
  peers: readonly FeedSlotPeerLookupRow[],
  input: { peerThreadId?: string; displayName?: string; rimvioId?: string | null },
): FeedSlotPeerLookupRow | null {
  if (input.peerThreadId) {
    const byId = peers.find((row) => row.peerThreadId === input.peerThreadId);
    if (byId) {
      return byId;
    }
  }

  const label = input.displayName?.trim();
  if (label) {
    const byName = peers.find((row) => peerDisplayNamesMatch(row.displayName, label));
    if (byName) {
      return byName;
    }
  }

  const rim = input.rimvioId?.trim().toLowerCase();
  if (rim) {
    const byRim = peers.find(
      (row) => row.rimvioId?.trim().toLowerCase() === rim,
    );
    if (byRim) {
      return byRim;
    }
  }

  return null;
}

function buildContext(
  peers: readonly FeedSlotPeerLookupRow[],
  input: {
    peerThreadId: string;
    displayName: string;
    source: FeedSlotPeerContext["source"];
  },
): FeedSlotPeerContext | null {
  const threadId = input.peerThreadId.trim();
  const name = input.displayName.trim();
  if (!threadId || !name) {
    return null;
  }

  const row = findPeerRow(peers, {
    peerThreadId: threadId,
    displayName: name,
  });

  return {
    peerThreadId: row?.peerThreadId ?? threadId,
    displayName: row?.displayName?.trim() || name,
    avatarUrl: row?.avatarUrl ?? null,
    rimvioId: row?.rimvioId ?? null,
    emailLower: row?.emailLower ?? null,
    source: input.source,
  };
}

function resolveFromMessageId(
  messageId: string | null | undefined,
  lookup: FeedSlotPeerLookup,
): FeedSlotPeerContext | null {
  if (!messageId?.trim()) {
    return null;
  }

  const idx = lookup.messages.findIndex((row) => row.id === messageId);
  if (idx < 0) {
    return null;
  }

  for (let i = idx; i >= 0; i -= 1) {
    const wire = lookup.messages[i]?.feedPeerTalkThread;
    if (wire?.peerThreadId && wire.displayName?.trim()) {
      return buildContext(lookup.peers, {
        peerThreadId: wire.peerThreadId,
        displayName: wire.displayName,
        source: "feed_talk",
      });
    }
  }

  return null;
}

function resolveFromSurfacePeople(
  slot: FeedTodaySlot & { kind: "surface" },
  lookup: FeedSlotPeerLookup,
): FeedSlotPeerContext[] {
  const results: FeedSlotPeerContext[] = [];
  const seen = new Set<string>();

  for (const person of slot.surface.people) {
    const name = person.displayName?.trim();
    if (!name) {
      continue;
    }
    const matched = findPeerRow(lookup.peers, { displayName: name });
    if (!matched || seen.has(matched.peerThreadId)) {
      continue;
    }
    const ctx = buildContext(lookup.peers, {
      peerThreadId: matched.peerThreadId,
      displayName: matched.displayName,
      source: "surface_people",
    });
    if (ctx) {
      seen.add(ctx.peerThreadId);
      results.push(ctx);
    }
  }

  return results;
}

function resolveFromNameHints(
  slot: FeedTodaySlot,
  lookup: FeedSlotPeerLookup,
): FeedSlotPeerContext[] {
  const results: FeedSlotPeerContext[] = [];
  const seen = new Set<string>();

  for (const hint of extractNameHints(collectSlotText(slot))) {
    const matched = findPeerRow(lookup.peers, { displayName: hint });
    if (!matched || seen.has(matched.peerThreadId)) {
      continue;
    }
    const ctx = buildContext(lookup.peers, {
      peerThreadId: matched.peerThreadId,
      displayName: matched.displayName,
      source: "name_match",
    });
    if (ctx) {
      seen.add(ctx.peerThreadId);
      results.push(ctx);
    }
  }

  return results;
}

function resolveFromPlanPeer(
  plan: PlanContext | null | undefined,
  lookup: FeedSlotPeerLookup,
): FeedSlotPeerContext | null {
  const name = plan?.peerDisplayName?.trim();
  if (!name) {
    return null;
  }
  return buildContext(lookup.peers, {
    peerThreadId: plan.peerThreadId?.trim() || `plan:${plan.planId}`,
    displayName: name,
    source: "plan_metadata",
  });
}

/** Pure read — who is this appointment with? Up to 3 peers. */
export function resolveFeedSlotPeerContexts(
  slot: FeedTodaySlot,
  lookup: FeedSlotPeerLookup,
  plan?: PlanContext | null,
): FeedSlotPeerContext[] {
  if (lookup.peers.length === 0) {
    return [];
  }

  const seen = new Set<string>();
  const merged: FeedSlotPeerContext[] = [];

  const push = (ctx: FeedSlotPeerContext | null) => {
    if (!ctx || seen.has(ctx.peerThreadId)) {
      return;
    }
    seen.add(ctx.peerThreadId);
    merged.push(ctx);
  };

  push(resolveFromPlanPeer(plan, lookup));

  if (slot.kind === "calendar") {
    push(resolveFromMessageId(slot.row.event.entry?.messageId, lookup));
  }

  if (slot.kind === "surface") {
    for (const row of resolveFromSurfacePeople(slot, lookup)) {
      push(row);
    }
  }

  for (const row of resolveFromNameHints(slot, lookup)) {
    push(row);
  }

  return merged.slice(0, MAX_PEER_CHIPS);
}

/** First matched peer — convenience for single-peer flows. */
export function resolveFeedSlotPeerContext(
  slot: FeedTodaySlot,
  lookup: FeedSlotPeerLookup,
  plan?: PlanContext | null,
): FeedSlotPeerContext | null {
  return resolveFeedSlotPeerContexts(slot, lookup, plan)[0] ?? null;
}
