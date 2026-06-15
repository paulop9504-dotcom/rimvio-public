import type { FeedVisualMode, LinkActionItem } from "@/types/database";

export type BeamSnapshot = {
  slug: string;
  title: string;
  original_url: string;
  domain: string;
  category: string | null;
  thumbnail_url: string | null;
  actions: LinkActionItem[];
  visual_mode: FeedVisualMode | null;
  source_type: string | null;
  expires_at: string | null;
  primary_action_label: string;
  primary_action_href: string;
  created_at: string;
};
