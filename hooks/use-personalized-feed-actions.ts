"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { normalizeEnricherContext } from "@/lib/enrichers/context";
import { toContextBin } from "@/lib/intent/context-bin";
import { filterFeedDisplayActions } from "@/lib/feed/feed-action-filter";
import { dropMismatchedOpenActions } from "@/lib/feed/action-title-guard";
import {
  findOriginalUrlAction,
} from "@/lib/feed/action-rotation";
import { openOriginalLabel } from "@/lib/copy/human-ko";
import { toDomainFamily } from "@/lib/personalization/action-family";
import { trackUserAction } from "@/lib/personalization/track-user-action";
import { readReceiptTiming } from "@/lib/personalization/receipt-exposure";
import {
  getPersonalizationSessionId,
  readLocalLinkState,
  readLocalRecentProfile,
  readPrimaryActionLock,
  recordLocalLinkReopen,
} from "@/lib/personalization/client-store";
import { pickPersonalizedPrimaryAction } from "@/lib/personalization/score-guardrails";
import type { LinkLifecycleRecord } from "@/lib/personalization/types";
import type { LinkActionItem, LinkRow } from "@/types/database";

const REOPEN_DEBOUNCE_MS = 800;

type LifecycleCacheEntry = {
  state: LinkLifecycleRecord;
  fetchedAt: number;
};

const lifecycleCache = new Map<string, LifecycleCacheEntry>();

function cacheKey(linkId: string) {
  return linkId;
}

function normalizeHref(href?: string | null) {
  return href?.replace(/\/$/, "") ?? "";
}

function buildRotation(
  actions: LinkActionItem[],
  originalUrl: string,
  primary: LinkActionItem
) {
  const displayActions = filterFeedDisplayActions(actions);
  const original =
    findOriginalUrlAction(actions, originalUrl) ??
    ({
      id: "feed-original-url",
      label: openOriginalLabel(),
      kind: "open",
      href: originalUrl,
      payload: { icon: "external-link" },
    } satisfies LinkActionItem);

  const rotation: LinkActionItem[] = [];
  const seen = new Set<string>();

  const pushUnique = (action: LinkActionItem) => {
    if (seen.has(action.id)) {
      return;
    }
    seen.add(action.id);
    rotation.push(action);
  };

  pushUnique(primary);
  if (primary.id !== original.id) {
    pushUnique(original);
  }
  for (const action of displayActions) {
    pushUnique(action);
  }

  return rotation;
}

/**
 * Optimistic personalized feed actions.
 *
 * Anti-flicker strategy:
 * 1. Immediate local lifecycle reopen on slide active (no await).
 * 2. Primary computed from local profile + lifecycle first.
 * 3. Server reconcile in useTransition — only swap if action.id changes AND
 *    new primary differs from stabilized ref (margin enforced in scorer).
 * 4. primaryStableKey only bumps when focused action id actually changes.
 */
export function usePersonalizedFeedActions(
  link: LinkRow,
  actionIndex: number,
  isActive: boolean
) {
  const [, startTransition] = useTransition();
  const [serverLifecycle, setServerLifecycle] = useState<LinkLifecycleRecord | null>(
    null
  );
  const [primaryLockVersion, setPrimaryLockVersion] = useState(0);
  const stabilizedPrimaryId = useRef<string | null>(null);
  const stabilizedLinkId = useRef<string | null>(null);
  const lastReopenAt = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const onPrimaryLock = () => {
      setPrimaryLockVersion((value) => value + 1);
    };

    window.addEventListener("rimvio:primary-lock", onPrimaryLock);
    return () => window.removeEventListener("rimvio:primary-lock", onPrimaryLock);
  }, []);

  useEffect(() => {
    if (stabilizedLinkId.current !== link.id) {
      stabilizedLinkId.current = link.id;
      stabilizedPrimaryId.current = null;
    }
  }, [link.id]);

  const domainFamily = useMemo(
    () => toDomainFamily(link.domain, link.category),
    [link.category, link.domain]
  );

  const localLifecycle = useMemo(() => {
    const cached = lifecycleCache.get(cacheKey(link.id));
    if (cached && Date.now() - cached.fetchedAt < 60_000) {
      return cached.state;
    }

    return readLocalLinkState(link.id);
  }, [link.id, isActive, serverLifecycle]);

  const lifecycleState = serverLifecycle ?? localLifecycle;

  const context = useMemo(
    () => normalizeEnricherContext({ hour: new Date().getHours() }),
    []
  );
  const contextBin = useMemo(() => toContextBin(context), [context]);

  const profile = useMemo(() => readLocalRecentProfile(), [link.id, isActive]);

  const primaryLock = useMemo(
    () => readPrimaryActionLock(link.id),
    [link.id, isActive, primaryLockVersion]
  );

  const displayActions = useMemo(
    () =>
      dropMismatchedOpenActions(
        filterFeedDisplayActions(link.actions),
        link.title
      ),
    [link.actions, link.title]
  );

  const computedPrimary = useMemo(() => {
    if (displayActions.length === 0) {
      return null;
    }

    return (
      pickPersonalizedPrimaryAction({
        actions: displayActions,
        context,
        sourceUrl: link.original_url,
        profile,
        linkState: lifecycleState,
        domainFamily,
        contextBin,
        incumbentActionId:
          primaryLock?.actionId ?? stabilizedPrimaryId.current ?? undefined,
      }) ?? displayActions[0]
    );
  }, [
    displayActions,
    link.original_url,
    context,
    profile,
    lifecycleState,
    domainFamily,
    contextBin,
    primaryLock?.actionId,
  ]);

  if (computedPrimary) {
    stabilizedPrimaryId.current = computedPrimary.id;
  }

  const primary = computedPrimary ?? displayActions[0] ?? null;

  const rotation = useMemo(
    () =>
      primary
        ? buildRotation(displayActions, link.original_url, primary)
        : [],
    [displayActions, link.original_url, primary]
  );

  const focused = rotation[actionIndex % rotation.length];

  useEffect(() => {
    if (!isActive) {
      return;
    }

    const now = Date.now();
    if (now - lastReopenAt.current < REOPEN_DEBOUNCE_MS) {
      return;
    }

    lastReopenAt.current = now;

    const optimistic = recordLocalLinkReopen({
      linkId: link.id,
      domainFamily,
      linkCategory: link.category,
    });

    lifecycleCache.set(cacheKey(link.id), {
      state: optimistic,
      fetchedAt: now,
    });

    startTransition(() => {
      void fetch("/api/personalization/reopen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: getPersonalizationSessionId(),
          linkId: link.id,
          domainFamily,
          linkCategory: link.category,
        }),
        keepalive: true,
      })
        .then(async (response) => {
          if (!response.ok) {
            return;
          }

          const payload = (await response.json()) as {
            state?: LinkLifecycleRecord;
          };

          if (payload.state) {
            lifecycleCache.set(cacheKey(link.id), {
              state: payload.state,
              fetchedAt: Date.now(),
            });
            setServerLifecycle(payload.state);
          }
        })
        .catch(() => {
          // Keep optimistic state.
        });
    });
  }, [isActive, link.id, link.category, domainFamily]);

  return {
    rotation,
    focused,
    lifecycleState,
    primaryStableKey: `${link.id}:${stabilizedPrimaryId.current ?? focused.id}:${lifecycleState?.lifecycle_state ?? "saved"}:${lifecycleState?.reopen_count ?? 0}`,
  };
}

export function invalidateLinkLifecycleCache(linkId: string) {
  lifecycleCache.delete(cacheKey(linkId));
}

export function trackPersonalizationClick(input: {
  link: LinkRow;
  action: LinkActionItem;
  actionFamily: string;
  contextBin?: string;
}) {
  const domainFamily = toDomainFamily(input.link.domain, input.link.category);
  const contextBin =
    input.contextBin ??
    toContextBin(normalizeEnricherContext({ hour: new Date().getHours() }));
  const receiptTiming = readReceiptTiming(input.link.id);

  trackUserAction({
    event: "click",
    link: input.link,
    actionKey: `${input.action.kind}:${input.action.payload?.icon ?? input.action.label}`,
    actionFamily: input.actionFamily as import("@/lib/personalization/types").ActionFamily,
    domainFamily,
    contextBin,
    updateProfile: true,
    metadata: {
      chip_id: input.action.id,
      ...receiptTiming,
    },
  });
}
