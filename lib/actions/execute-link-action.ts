import { triggerActionHaptic } from "@/lib/action-shadowing";
import {
  openHrefWithFallback,
  readActionFallbackHref,
} from "@/lib/actions/open-with-fallback";
import { parseMapTitleFromUrl } from "@/lib/enrichers/url-intelligence";
import type { LinkActionItem } from "@/types/database";

const MAP_SCHEME_PATTERN = /^(nmap|kakaomap):/i;
const MAP_COPY_DELAY_MS = 150;

export function readActionCopyText(action: LinkActionItem): string | null {
  const value = action.payload?.copyText;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function resolveMapCopyText(action: LinkActionItem): string | null {
  const fromPayload = readActionCopyText(action);
  if (fromPayload) {
    return fromPayload;
  }

  if (!action.href) {
    return null;
  }

  return parseMapTitleFromUrl(action.href);
}

function isMapDeepLink(href: string) {
  return MAP_SCHEME_PATTERN.test(href.trim());
}

export async function copyActionText(
  action: LinkActionItem
): Promise<string | null> {
  const text = readActionCopyText(action);

  if (
    !text ||
    typeof navigator === "undefined" ||
    !navigator.clipboard?.writeText
  ) {
    return null;
  }

  try {
    await navigator.clipboard.writeText(text);
    return text;
  } catch {
    return null;
  }
}

export type RunLinkActionResult = {
  copiedText: string | null;
};

export async function runLinkAction(
  action: LinkActionItem
): Promise<RunLinkActionResult> {
  const href = action.href ?? "";
  const mapCopyText =
    href && isMapDeepLink(href) ? resolveMapCopyText(action) : null;

  let copiedText = await copyActionText(action);

  if (!copiedText && mapCopyText) {
    copiedText = await copyActionText({
      ...action,
      payload: {
        ...action.payload,
        copyText: mapCopyText,
      },
    });
  }

  const fallbackHref = readActionFallbackHref(action.payload);

  switch (action.kind) {
    case "open":
      if (action.href) {
        if (mapCopyText) {
          await new Promise((resolve) =>
            window.setTimeout(resolve, MAP_COPY_DELAY_MS)
          );
        }

        openHrefWithFallback(action.href, fallbackHref ?? action.href, action.payload);
      }
      break;

    case "copy":
      triggerActionHaptic();

      if (!copiedText && action.payload?.copyText) {
        await copyActionText(action);
      } else if (action.href && !copiedText) {
        try {
          await navigator.clipboard.writeText(action.href);
        } catch {
          // Clipboard blocked.
        }
      }
      break;

    case "share":
      triggerActionHaptic();

      if (action.href && typeof navigator !== "undefined" && navigator.share) {
        void navigator.share({ title: action.label, url: action.href });
      }
      break;

    default:
      if (action.href) {
        openHrefWithFallback(action.href, fallbackHref ?? action.href, action.payload);
      } else {
        triggerActionHaptic();
      }
  }

  return { copiedText };
}
