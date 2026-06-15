import type { LinkActionItem } from "@/types/database";

/** Lower = faster (Fogg Ability). */
export function scoreActionEffort(action: LinkActionItem): number {
  if (action.kind === "copy") {
    return 99;
  }

  if (action.kind === "remind") {
    return 1;
  }

  if (action.payload?.blinkAction) {
    return 1;
  }

  const href = action.href ?? "";

  if (href.startsWith("tel:") || href.startsWith("telprompt:")) {
    return 1;
  }

  if (href.startsWith("/") && !href.includes("chatgpt") && !href.includes("perplexity")) {
    return 1.5;
  }

  if (/chatgpt\.com|perplexity\.ai|translate\.google/i.test(href)) {
    return 3;
  }

  if (action.kind === "share") {
    return 2;
  }

  return 2;
}

export function pickFoggPrimaryAction(
  actions: LinkActionItem[]
): LinkActionItem | null {
  if (actions.length === 0) {
    return null;
  }

  const openActions = actions.filter(
    (action) => action.kind === "open" && Boolean(action.href?.trim())
  );

  const pool =
    openActions.length > 0
      ? openActions
      : actions.filter((action) => action.kind !== "copy");

  const ranked = [...(pool.length > 0 ? pool : actions)].sort(
    (left, right) => scoreActionEffort(left) - scoreActionEffort(right)
  );

  return ranked[0] ?? actions[0];
}

export function rankActionsByFogg(actions: LinkActionItem[]): LinkActionItem[] {
  if (actions.length <= 1) {
    return actions;
  }

  const [primary, ...rest] = actions;
  const rankedRest = [...rest].sort(
    (left, right) => scoreActionEffort(left) - scoreActionEffort(right)
  );

  return [primary, ...rankedRest];
}

export function isInstantAction(action: LinkActionItem) {
  return scoreActionEffort(action) <= 1.5;
}
