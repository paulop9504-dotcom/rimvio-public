import { formatPhoneDisplay, toDialPrepTelHref, buildContactActionLabel } from "@/lib/enrichers/extract-phone";
import type { LinkActionItem } from "@/types/database";

export function createOpenAction(input: {
  label: string;
  href: string;
  icon: string;
  copyText?: string | null;
  fallbackHref?: string | null;
  contextBoost?: string;
  payload?: Record<string, unknown>;
}): LinkActionItem {
  return {
    id: crypto.randomUUID(),
    kind: "open",
    label: input.label,
    href: input.href,
    payload: {
      icon: input.icon,
      ...(input.contextBoost ? { contextBoost: input.contextBoost } : {}),
      ...(input.copyText?.trim() ? { copyText: input.copyText.trim() } : {}),
      ...(input.fallbackHref?.trim()
        ? { fallbackHref: input.fallbackHref.trim() }
        : {}),
      ...(input.payload ?? {}),
    },
  };
}

export function attachCopyText(
  action: LinkActionItem,
  copyText: string | null | undefined
): LinkActionItem {
  if (!copyText?.trim()) {
    return action;
  }

  return {
    ...action,
    payload: {
      ...action.payload,
      copyText: copyText.trim(),
    },
  };
}

export function createCopyOnlyAction(
  label: string,
  copyText: string
): LinkActionItem {
  return {
    id: crypto.randomUUID(),
    kind: "copy",
    label,
    payload: { icon: "copy", copyText: copyText.trim() },
  };
}

export function createCallAction(
  phone: string,
  label?: string
): LinkActionItem {
  const display = formatPhoneDisplay(phone);
  const resolvedLabel =
    label?.trim() && !/^연락\/공유$/u.test(label.trim())
      ? label.trim()
      : buildContactActionLabel(display);

  return createOpenAction({
    label: resolvedLabel,
    href: toDialPrepTelHref(display),
    icon: "phone",
    copyText: display,
    contextBoost: "phone",
    payload: { dialPrep: true },
  });
}

export function attachCopyToActions(
  actions: LinkActionItem[],
  copyText: string | null | undefined
): LinkActionItem[] {
  if (!copyText?.trim()) {
    return actions;
  }

  return actions.map((action) => attachCopyText(action, copyText));
}
