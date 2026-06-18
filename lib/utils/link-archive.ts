import type { LinkRow } from "@/types/database";

export function isLinkArchived(link: LinkRow, now = Date.now()): boolean {
  if (!link.expires_at) {
    return false;
  }

  return new Date(link.expires_at).getTime() <= now;
}

export function filterActiveLinks(links: LinkRow[], now = Date.now()): LinkRow[] {
  return links.filter((link) => !isLinkArchived(link, now));
}

export function filterArchivedLinks(
  links: LinkRow[],
  now = Date.now()
): LinkRow[] {
  return links.filter((link) => isLinkArchived(link, now));
}
