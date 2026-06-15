import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveCategory } from "@/lib/categories/resolve-category";
import { isLinkCategory } from "@/lib/categories/types";
import type { EnrichedLink } from "@/lib/enrichers/types";
import { buildVisualFieldsFromEnriched } from "@/lib/feed/feed-visual";
import { sanitizeLinkTitle } from "@/lib/feed/sanitize-link-title";
import { createShareSlug } from "@/lib/share/share-slug";
import type { Database, LinkRow } from "@/types/database";

function extractDomain(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "link";
  }
}

export async function insertEnrichedLink(
  supabase: SupabaseClient<Database>,
  enriched: EnrichedLink,
  options?: {
    category?: string | null;
    userId?: string | null;
    expiresAt?: string | null;
  }
): Promise<LinkRow> {
  const domain = extractDomain(enriched.url);
  const category =
    options?.category && isLinkCategory(options.category)
      ? options.category
      : resolveCategory(enriched);
  const visual = buildVisualFieldsFromEnriched(enriched);
  const share_slug = createShareSlug();
  const title = sanitizeLinkTitle({
    title: enriched.title,
    original_url: enriched.url,
    domain,
    source_type: visual.source_type,
    category,
  });

  const { data, error } = await supabase
    .from("links")
    .insert({
      original_url: enriched.url,
      title,
      thumbnail_url: enriched.image,
      domain,
      category,
      visual_mode: visual.visual_mode,
      source_type: visual.source_type,
      share_slug,
      link_status: "open",
      user_id: options?.userId ?? null,
      expires_at: options?.expiresAt ?? null,
      actions: enriched.actions,
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}
