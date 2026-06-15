import type { LinkActionItem, LinkRow } from "@/types/database";

export function resolveBeamOrigin(fallback = "http://localhost:3000") {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }

  return process.env.NEXT_PUBLIC_APP_URL ?? fallback;
}

export function buildBeamPath(slug: string) {
  return `/s/${slug}`;
}

export function buildBeamUrl(slug: string, origin?: string) {
  return `${origin ?? resolveBeamOrigin()}${buildBeamPath(slug)}`;
}

export function buildRoomPath(slug: string) {
  return `/r/${slug}`;
}

export function buildRoomUrl(slug: string, origin?: string) {
  return `${origin ?? resolveBeamOrigin()}${buildRoomPath(slug)}`;
}

export function primaryActionLabel(link: Pick<LinkRow, "actions" | "title">) {
  return link.actions[0]?.label ?? "열기";
}

export function primaryActionHref(
  link: Pick<LinkRow, "actions" | "original_url">
) {
  return link.actions[0]?.href ?? link.original_url;
}

export function toBeamSnapshot(link: LinkRow) {
  return {
    slug: link.share_slug!,
    title: link.title,
    original_url: link.original_url,
    domain: link.domain,
    category: link.category,
    thumbnail_url: link.thumbnail_url,
    actions: link.actions as LinkActionItem[],
    visual_mode: link.visual_mode ?? null,
    source_type: link.source_type ?? null,
    expires_at: link.expires_at,
    primary_action_label: primaryActionLabel(link),
    primary_action_href: primaryActionHref(link),
    created_at: link.created_at,
  };
}
