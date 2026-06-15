import type { ContextRemoteState } from "@/lib/remote/resolve-context-remote";
import type { LinkActionItem } from "@/types/database";
import { FEED_MAX_SECONDARY } from "@/lib/feed/feed-panel-limits";

function actionKey(action: LinkActionItem): string {
  return action.id || action.label;
}

function dedupeActions(
  actions: LinkActionItem[],
  exclude = new Set<string>()
): LinkActionItem[] {
  const seen = new Set<string>();
  const out: LinkActionItem[] = [];

  for (const action of actions) {
    const key = actionKey(action);
    if (exclude.has(key) || seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(action);
  }

  return out;
}

/** Fold context-remote actions into the single in-slide panel (no duplicate strip). */
export function mergeFeedPanelWithRemote(input: {
  remote: ContextRemoteState | null | undefined;
  isActive: boolean;
  cardSignal: string | null;
  focused: LinkActionItem;
  secondary: LinkActionItem[];
  maxSecondary?: number;
}): {
  signalLine: string | null;
  secondary: LinkActionItem[];
  remoteActionIds: Set<string>;
} {
  const {
    remote,
    isActive,
    cardSignal,
    focused,
    secondary,
    maxSecondary = FEED_MAX_SECONDARY,
  } = input;

  if (!isActive || !remote?.visible) {
    return {
      signalLine: cardSignal,
      secondary: secondary.slice(0, maxSecondary),
      remoteActionIds: new Set<string>(),
    };
  }

  const remotePool = dedupeActions([
    ...(remote.primary ? [remote.primary] : []),
    ...remote.secondary,
  ]);
  const focusedKey = actionKey(focused);
  const withoutFocused = remotePool.filter(
    (action) => actionKey(action) !== focusedKey
  );
  const merged = dedupeActions(
    [...withoutFocused, ...secondary],
    new Set([focusedKey])
  ).slice(0, maxSecondary);
  const remoteActionIds = new Set(remotePool.map(actionKey));

  return {
    signalLine: remote.signalLine?.trim() || cardSignal,
    secondary: merged,
    remoteActionIds,
  };
}
