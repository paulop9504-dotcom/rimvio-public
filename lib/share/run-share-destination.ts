import { openHrefWithFallback } from "@/lib/actions/open-with-fallback";
import { triggerActionHaptic } from "@/lib/action-shadowing";
import { runKakaoShare } from "@/lib/share/kakao-share";
import { buildBeamShareText } from "@/lib/share/beam-share-text";
import { buildBeamUrl } from "@/lib/share/beam-url";
import type { ShareDestinationDef, ShareLinkInput } from "@/lib/share/share-destinations";

export async function runShareDestination(
  destination: ShareDestinationDef,
  link: ShareLinkInput
): Promise<{ copiedText: string | null; opened: boolean }> {
  if (destination.id === "native") {
    const shared = await runSystemShare(link);
    return { copiedText: null, opened: shared };
  }

  if (destination.id === "kakao") {
    triggerActionHaptic();
    const result = await runKakaoShare(link);
    return { copiedText: result.copiedText, opened: result.opened };
  }

  triggerActionHaptic();

  const copyText = destination.buildCopy(link);
  let copiedText: string | null = null;

  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(copyText);
      copiedText = copyText;
    } catch {
      copiedText = null;
    }
  }

  const { appHref, webHref } = destination.resolveHref(link);
  let opened = false;

  if (appHref || webHref) {
    if (appHref) {
      openHrefWithFallback(appHref, webHref);
      opened = true;
    } else if (webHref) {
      window.location.assign(webHref);
      opened = true;
    }
  }

  return { copiedText, opened };
}

export async function runSystemShare(link: ShareLinkInput) {
  triggerActionHaptic();

  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({
        title: link.title,
        text: link.share_slug ? buildBeamShareText(link) : link.title,
        url: link.share_slug ? buildBeamUrl(link.share_slug) : link.original_url,
      });
      return true;
    } catch {
      return false;
    }
  }

  return false;
}
