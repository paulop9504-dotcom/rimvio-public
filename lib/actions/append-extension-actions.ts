import { buildDetectedServiceIntentActions } from "@/lib/actions/service-intent-actions";
import { buildSmartSuiteActions } from "@/lib/actions/smart-suite-actions";
import {
  buildExtensionActionsForProfile,
  buildUniversalExtensionActions,
  detectExtensionProfile,
  type ExtensionContext,
} from "@/lib/actions/extension-catalog";
import { MAX_LINK_ACTIONS } from "@/lib/actions/constants";
import type { LinkActionItem } from "@/types/database";

const FALLBACK_LABEL_PATTERN = /그 페이지로 가기|원본 열기|원본 페이지/i;

function actionKey(action: LinkActionItem) {
  return `${action.label}|${action.href ?? ""}|${action.kind}`;
}

function isFallbackAction(action: LinkActionItem) {
  return (
    FALLBACK_LABEL_PATTERN.test(action.label) ||
    action.payload?.icon === "external-link"
  );
}

function dedupeActions(actions: LinkActionItem[]) {
  const seen = new Set<string>();
  const next: LinkActionItem[] = [];

  for (const action of actions) {
    const key = actionKey(action);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    next.push(action);
  }

  return next;
}

function splitFallback(actions: LinkActionItem[]) {
  const idx = actions.findIndex(isFallbackAction);
  if (idx === -1) {
    return { core: actions, fallback: null as LinkActionItem | null };
  }

  return {
    core: [...actions.slice(0, idx), ...actions.slice(idx + 1)],
    fallback: actions[idx],
  };
}

function insertAfterPrimary(actions: LinkActionItem[], additions: LinkActionItem[]) {
  if (additions.length === 0) {
    return actions;
  }

  if (actions.length === 0) {
    return additions;
  }

  return [actions[0], ...additions, ...actions.slice(1)];
}

function insertAtEnd(actions: LinkActionItem[], additions: LinkActionItem[]) {
  if (additions.length === 0) {
    return actions;
  }

  return [...actions, ...additions];
}

function hasSimilarAction(actions: LinkActionItem[], candidate: LinkActionItem) {
  const candidateHref = candidate.href?.replace(/\/$/, "") ?? "";
  const candidateLabel = candidate.label.replace(/\s+/g, " ").trim();

  return actions.some((action) => {
    if (actionKey(action) === actionKey(candidate)) {
      return true;
    }

    const href = action.href?.replace(/\/$/, "") ?? "";
    if (candidateHref && href && candidateHref === href) {
      return true;
    }

    if (
      candidateLabel.length >= 6 &&
      action.label.replace(/\s+/g, " ").trim() === candidateLabel
    ) {
      return true;
    }

    return false;
  });
}

function filterNew(base: LinkActionItem[], additions: LinkActionItem[]) {
  return additions.filter((action) => !hasSimilarAction(base, action));
}

export function appendExtensionActions(
  actions: LinkActionItem[],
  ctx: ExtensionContext
): LinkActionItem[] {
  const { core, fallback } = splitFallback(actions);
  const profile = detectExtensionProfile(ctx);
  const serviceIntentActions = filterNew(core, buildDetectedServiceIntentActions(ctx));
  const smartSuiteActions = filterNew(core, buildSmartSuiteActions(ctx, 1));
  const profileActions = filterNew(
    core,
    buildExtensionActionsForProfile(profile, ctx)
  ).slice(0, 1);
  const universal = filterNew(core, buildUniversalExtensionActions(ctx)).slice(0, 1);

  let next = insertAfterPrimary(core, filterNew(core, serviceIntentActions));
  next = insertAfterPrimary(next, filterNew(next, smartSuiteActions));
  next = insertAtEnd(next, filterNew(next, profileActions));
  next = insertAtEnd(next, filterNew(next, universal));
  next = dedupeActions(next);

  const cap = fallback ? MAX_LINK_ACTIONS - 1 : MAX_LINK_ACTIONS;
  next = next.slice(0, cap);

  if (fallback) {
    next.push(fallback);
  }

  return next;
}
