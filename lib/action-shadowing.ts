import { resolveAutoTranslatedOpenHref } from "@/lib/links/auto-translate-open";
import type { LinkActionItem } from "@/types/database";

type ShadowRouter = {
  prefetch: (href: string) => void;
};

type ShadowIntent = "hover" | "touch";

const shadowedHrefs = new Set<string>();
const shadowedOrigins = new Set<string>();
const shadowedActionKeys = new Set<string>();

function shadowKey(action: LinkActionItem, href?: string) {
  return `${action.kind}:${href ?? action.label}`;
}

function isInternalHref(href: string) {
  return href.startsWith("/");
}

function getExternalOrigin(href: string) {
  try {
    return new URL(href).origin;
  } catch {
    return null;
  }
}

function injectLinkHint(
  rel: "dns-prefetch" | "preconnect" | "prefetch",
  href: string,
  hintId: string
) {
  if (typeof document === "undefined") {
    return;
  }

  if (document.getElementById(hintId)) {
    return;
  }

  const link = document.createElement("link");
  link.id = hintId;
  link.rel = rel;
  link.href = href;
  if (rel === "prefetch") {
    link.as = "document";
  }
  if (rel === "preconnect") {
    link.crossOrigin = "anonymous";
  }

  document.head.appendChild(link);
}

function warmExternalOrigin(origin: string) {
  if (shadowedOrigins.has(origin)) {
    return;
  }

  shadowedOrigins.add(origin);

  const safeId = origin.replace(/[^a-zA-Z0-9]/g, "_");
  injectLinkHint("dns-prefetch", origin, `shadow-dns-${safeId}`);
  injectLinkHint("preconnect", origin, `shadow-preconnect-${safeId}`);
}

function prefetchDocument(href: string) {
  if (shadowedHrefs.has(href)) {
    return;
  }

  shadowedHrefs.add(href);

  const safeId = href.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 48);
  injectLinkHint("prefetch", href, `shadow-prefetch-${safeId}`);

  void fetch(href, {
    method: "HEAD",
    mode: "no-cors",
    keepalive: true,
  }).catch(() => undefined);
}

export function shadowHref(
  href: string,
  router?: ShadowRouter,
  intent: ShadowIntent = "touch"
) {
  if (isInternalHref(href)) {
    router?.prefetch(href);
    return;
  }

  const origin = getExternalOrigin(href);
  if (origin) {
    warmExternalOrigin(origin);
  }

  if (intent === "touch") {
    prefetchDocument(href);
  }
}

export function triggerActionHaptic() {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(10);
  }
}

export function isExternalHref(href: string) {
  return /^https?:\/\//i.test(href);
}

/** Hand off to the system browser / native app immediately. */
export function launchExternalUrl(href: string) {
  triggerActionHaptic();
  window.location.assign(resolveAutoTranslatedOpenHref(href));
}

export function shadowAction(
  action: LinkActionItem,
  options: {
    router?: ShadowRouter;
    fallbackHref?: string;
    intent?: ShadowIntent;
  } = {}
) {
  const intent = options.intent ?? "touch";
  const href = action.href ?? options.fallbackHref;
  const key = shadowKey(action, href);

  if (shadowedActionKeys.has(`${key}:${intent}`)) {
    if (href) {
      shadowHref(href, options.router, intent);
    }
    return;
  }

  shadowedActionKeys.add(`${key}:${intent}`);

  switch (action.kind) {
    case "open":
    case "copy":
    case "share":
    case "custom":
      if (href) {
        shadowHref(href, options.router, intent);
      }
      break;
    case "save":
    case "remind":
      break;
  }
}

export function shadowPrimaryLink(
  href: string,
  router?: ShadowRouter,
  intent: ShadowIntent = "touch"
) {
  shadowHref(href, router, intent);
}
