import { openOriginalLabel } from "@/lib/copy/human-ko";
import { isOpenOriginalAction } from "@/lib/feed/feed-display";
import { filterFeedDisplayActions } from "@/lib/feed/feed-action-filter";
import { rankFeedLinkActionsForDock } from "@/lib/feed/rank-feed-link-actions";
import type { LinkActionItem, LinkRow } from "@/types/database";

function normalizeHref(href?: string | null) {
  return href?.replace(/\/$/, "") ?? "";
}

export function findOriginalUrlAction(
  actions: LinkActionItem[],
  originalUrl: string
): LinkActionItem | null {
  const target = normalizeHref(originalUrl);
  if (!target) {
    return null;
  }

  return (
    actions.find(
      (action) =>
        isOpenOriginalAction(action.label) ||
        (action.kind === "open" &&
          normalizeHref(action.href) === target &&
          action.payload?.icon === "external-link")
    ) ??
    actions.find(
      (action) =>
        action.kind === "open" && normalizeHref(action.href) === target
    ) ??
    null
  );
}

function buildOriginalFallback(originalUrl: string): LinkActionItem {
  return {
    id: "feed-original-url",
    label: openOriginalLabel(),
    kind: "open",
    href: originalUrl,
    payload: { icon: "external-link" },
  };
}

/** Feed refresh rail: learned MAIN first, original URL on first press, then the rest. */
export function buildFeedActionRotation(
  actions: LinkActionItem[],
  originalUrl: string,
  linkMeta?: Pick<LinkRow, "domain" | "category">,
): LinkActionItem[] {
  const displayActions = filterFeedDisplayActions(actions);

  if (displayActions.length === 0) {
    return [buildOriginalFallback(originalUrl)];
  }

  const primary =
    linkMeta &&
    rankFeedLinkActionsForDock({
      actions: displayActions,
      link: { ...linkMeta, original_url: originalUrl },
    })[0]?.action;
  const resolvedPrimary = primary ?? displayActions[0];
  const original =
    findOriginalUrlAction(actions, originalUrl) ?? buildOriginalFallback(originalUrl);

  const rotation: LinkActionItem[] = [];
  const seen = new Set<string>();

  const pushUnique = (action: LinkActionItem) => {
    if (seen.has(action.id)) {
      return;
    }
    seen.add(action.id);
    rotation.push(action);
  };

  pushUnique(resolvedPrimary);
  if (resolvedPrimary.id !== original.id) {
    pushUnique(original);
  }
  for (const action of displayActions) {
    pushUnique(action);
  }

  return rotation;
}

export function resolveFeedFocusedAction(
  actions: LinkActionItem[],
  originalUrl: string,
  actionIndex: number,
  linkMeta?: Pick<LinkRow, "domain" | "category">,
): LinkActionItem {
  const rotation = buildFeedActionRotation(actions, originalUrl, linkMeta);
  return rotation[actionIndex % rotation.length];
}
