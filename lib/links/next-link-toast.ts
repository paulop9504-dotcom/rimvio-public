import { sanitizeLinkTitle } from "@/lib/feed/sanitize-link-title";
import { suggestNextLink } from "@/lib/links/suggest-next-link";
import { copy } from "@/lib/copy/human-ko";
import type { LinkRow } from "@/types/database";
import { toast } from "sonner";

export function toastNextLinkSuggestion(
  current: LinkRow,
  pool: LinkRow[],
  onOpen?: (link: LinkRow) => void
) {
  const next = suggestNextLink(current, pool);

  if (!next) {
    return;
  }

  const title = sanitizeLinkTitle({
    title: next.title,
    original_url: next.original_url,
    domain: next.domain,
    source_type: next.source_type,
    category: next.category,
  });

  toast.success(copy.nextLink.title, {
    description: title,
    action: onOpen
      ? {
          label: copy.nextLink.open,
          onClick: () => onOpen(next),
        }
      : undefined,
  });
}
