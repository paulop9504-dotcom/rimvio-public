import { triggerActionHaptic } from "@/lib/action-shadowing";
import { resolveDialPrepTelHref } from "@/lib/enrichers/extract-phone";
import { resolveAutoTranslatedOpenHref } from "@/lib/links/auto-translate-open";

const APP_OPEN_WAIT_MS = 1400;

export function isCustomSchemeHref(href: string) {
  return /^[a-z][a-z0-9+.-]*:/i.test(href) && !/^https?:/i.test(href);
}

export function isDirectNavigationHref(href: string) {
  return /^(tel|telprompt|mailto|sms|geo):/i.test(href.trim());
}

function resolveOpenHref(href: string, payload?: Record<string, unknown> | null) {
  if (payload?.dialPrep === true || /^(tel|telprompt):/i.test(href)) {
    return resolveDialPrepTelHref(href);
  }

  return href;
}

export function readActionFallbackHref(
  payload: Record<string, unknown> | undefined
): string | null {
  const value = payload?.fallbackHref ?? payload?.webFallback;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/** Try app/deep link; if the page stays visible, open web fallback. */
export function openHrefWithFallback(
  appHref: string,
  webFallback: string | null,
  payload?: Record<string, unknown> | null
) {
  triggerActionHaptic();

  const resolvedHref = resolveOpenHref(resolveAutoTranslatedOpenHref(appHref), payload);
  const resolvedFallback = webFallback
    ? resolveAutoTranslatedOpenHref(webFallback)
    : null;

  if (isDirectNavigationHref(resolvedHref) || !isCustomSchemeHref(resolvedHref)) {
    window.location.assign(resolvedHref);
    return;
  }

  if (!resolvedFallback) {
    window.location.assign(resolvedHref);
    return;
  }

  let hidden = false;

  const onVisibility = () => {
    if (document.visibilityState === "hidden") {
      hidden = true;
    }
  };

  document.addEventListener("visibilitychange", onVisibility);
  window.location.assign(resolvedHref);

  window.setTimeout(() => {
    document.removeEventListener("visibilitychange", onVisibility);
    if (!hidden) {
      window.location.assign(resolvedFallback);
    }
  }, APP_OPEN_WAIT_MS);
}
