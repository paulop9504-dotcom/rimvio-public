import type { LinkRow } from "@/types/database";

export const CHAT_LINK_STUB: LinkRow = {
  id: "action-chat",
  user_id: null,
  original_url: "https://rimvio.app/chat",
  title: "Rimvio Chat",
  thumbnail_url: null,
  domain: "rimvio.app",
  category: "uncategorized",
  actions: [],
  visual_mode: "brand",
  source_type: "portal",
  share_slug: null,
  link_status: "open",
  created_at: new Date().toISOString(),
  expires_at: null,
};

export function chatActionLink(
  activeLink: LinkRow | null | undefined
): LinkRow {
  if (!activeLink) {
    return CHAT_LINK_STUB;
  }

  return activeLink;
}
