import { readBeamSnapshot, saveBeamSnapshot } from "@/lib/beam/server-beam-store";
import type { BeamSnapshot } from "@/lib/beam/types";
import { tryCreateClient } from "@/lib/supabase/server";
import { primaryActionHref, primaryActionLabel } from "@/lib/share/beam-url";
import type { LinkRow } from "@/types/database";

function linkToBeamSnapshot(link: LinkRow): BeamSnapshot {
  return {
    slug: link.share_slug!,
    title: link.title,
    original_url: link.original_url,
    domain: link.domain,
    category: link.category,
    thumbnail_url: link.thumbnail_url,
    actions: link.actions,
    visual_mode: link.visual_mode ?? null,
    source_type: link.source_type ?? null,
    expires_at: link.expires_at,
    primary_action_label: primaryActionLabel(link),
    primary_action_href: primaryActionHref(link),
    created_at: link.created_at,
  };
}

export async function resolveBeamSnapshot(slug: string): Promise<BeamSnapshot | null> {
  const supabase = await tryCreateClient();

  if (supabase) {
    const { data } = await supabase
      .from("links")
      .select("*")
      .eq("share_slug", slug)
      .maybeSingle();

    if (data?.share_slug) {
      return linkToBeamSnapshot(data);
    }
  }

  return readBeamSnapshot(slug);
}

export function persistBeamSnapshot(snapshot: BeamSnapshot) {
  saveBeamSnapshot(snapshot);
}
