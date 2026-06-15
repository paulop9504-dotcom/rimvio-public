import { sanitizeLinkTitle } from "@/lib/feed/sanitize-link-title";
import { primaryActionLabel } from "@/lib/share/beam-url";
import type { ShareLinkInput } from "@/lib/share/share-destinations";
import type { LinkRow } from "@/types/database";

export function linkToShareInput(link: LinkRow): ShareLinkInput {
  return {
    id: link.id,
    title: sanitizeLinkTitle({
      title: link.title,
      original_url: link.original_url,
      domain: link.domain,
      source_type: link.source_type,
      category: link.category,
    }),
    original_url: link.original_url,
    category: link.category,
    domain: link.domain,
    share_slug: link.share_slug,
    expires_at: link.expires_at,
    actions: link.actions,
    primary_action_label: primaryActionLabel(link),
  };
}
