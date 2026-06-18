import type { LinkRow } from "@/types/database";

export function buildLinkRawInput(link: LinkRow): string {
  return [
    link.title?.trim(),
    link.original_url?.trim(),
    link.domain?.trim(),
    link.category?.trim(),
  ]
    .filter(Boolean)
    .join("\n");
}
