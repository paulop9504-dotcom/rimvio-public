import { triggerActionHaptic } from "@/lib/action-shadowing";
import { ensureShareSlug } from "@/lib/rooms/client";
import { buildBeamShareText } from "@/lib/share/beam-share-text";
import { buildBeamUrl } from "@/lib/share/beam-url";
import { linkToShareInput } from "@/lib/share/link-to-share-input";
import type { LinkRow } from "@/types/database";

export function prepareLinksForShare(links: LinkRow[]) {
  return links.map((link) => ensureShareSlug(link));
}

export function buildBulkBeamShareText(links: LinkRow[]) {
  if (links.length === 0) {
    return "";
  }

  if (links.length === 1) {
    return buildBeamShareText(linkToShareInput(links[0]));
  }

  const header = `링크 ${links.length}개 — 눌러서 바로 열어요.`;
  const blocks = links.map((link, index) => {
    const input = linkToShareInput(link);
    const label = input.primary_action_label ?? "열기";
    const beamUrl = input.share_slug
      ? buildBeamUrl(input.share_slug)
      : input.original_url;

    return `${index + 1}. ▶ ${label}\n${input.title}\n${beamUrl}`;
  });

  return [header, "", ...blocks].join("\n");
}

export async function runBulkSystemShare(links: LinkRow[]) {
  const prepared = prepareLinksForShare(links);
  const text = buildBulkBeamShareText(prepared);

  triggerActionHaptic();

  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({
        title:
          prepared.length === 1
            ? prepared[0].title
            : `Rimvio 링크 ${prepared.length}개`,
        text,
      });
      return { shared: true, copiedText: null as string | null };
    } catch {
      // Fall through to clipboard.
    }
  }

  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return { shared: false, copiedText: text };
    } catch {
      return { shared: false, copiedText: null };
    }
  }

  return { shared: false, copiedText: null };
}
