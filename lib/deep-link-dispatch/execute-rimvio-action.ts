"use client";

import { openHrefWithFallback } from "@/lib/actions/open-with-fallback";
import { readActionFallbackHref } from "@/lib/actions/open-with-fallback";
import type { DeepLinkActionWire } from "@/lib/deep-link-dispatch/types";
import type { LinkActionItem } from "@/types/database";

export function isDeepLinkDispatchAction(action: LinkActionItem): boolean {
  return action.payload?.deepLinkDispatch === true;
}

export function executeRimvioAction(action: DeepLinkActionWire): boolean {
  if (action.status !== "READY_TO_EXECUTE" || !action.deep_link.trim()) {
    return false;
  }

  openHrefWithFallback(action.deep_link.trim(), null);
  return true;
}

export function executeDeepLinkDispatchAction(action: LinkActionItem): boolean {
  if (!action.href?.trim()) {
    return false;
  }

  const status = action.payload?.dispatchStatus;
  if (status === "MISSING_PARAMETER") {
    return false;
  }

  const fallback = readActionFallbackHref(action.payload ?? undefined);
  openHrefWithFallback(action.href.trim(), fallback, action.payload);
  return true;
}
