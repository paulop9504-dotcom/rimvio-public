import type { LinkRow } from "@/types/database";
import type { LinkAction } from "@/lib/types/link-action";

export function linkRowToActionCard(link: LinkRow): LinkAction {
  const primaryAction = link.actions[0];

  return {
    id: link.id,
    title: link.title,
    subtitle: `${link.domain}${link.category ? ` · ${link.category}` : ""}`,
    href: primaryAction?.href ?? link.original_url,
    prefetchHref: link.original_url,
    status: "ready",
    createdAt: link.created_at,
  };
}
