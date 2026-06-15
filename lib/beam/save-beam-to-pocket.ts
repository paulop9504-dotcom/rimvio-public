import type { BeamSnapshot } from "@/lib/beam/types";
import {
  addLocalLink,
  buildLocalLink,
  findLocalLinkByShareSlug,
  readLocalLinks,
} from "@/lib/local-links/store";
import type { LinkRow } from "@/types/database";

export type SaveBeamResult =
  | { status: "saved"; link: LinkRow }
  | { status: "already"; link: LinkRow };

export function beamSnapshotToLocalLink(beam: BeamSnapshot): LinkRow {
  return buildLocalLink({
    originalUrl: beam.original_url,
    title: beam.title,
    category: beam.category,
    thumbnailUrl: beam.thumbnail_url,
    expiresAt: beam.expires_at,
    actions: beam.actions,
    visualMode: beam.visual_mode,
    sourceType: beam.source_type,
    shareSlug: beam.slug,
  });
}

export function findBeamInPocket(slug: string) {
  const bySlug = findLocalLinkByShareSlug(slug);
  if (bySlug) {
    return bySlug;
  }

  return null;
}

export function saveBeamToPocket(beam: BeamSnapshot): SaveBeamResult {
  const existing =
    findBeamInPocket(beam.slug) ??
    readLocalLinks().find((link) => link.original_url === beam.original_url) ??
    null;

  if (existing) {
    return { status: "already", link: existing };
  }

  const link = beamSnapshotToLocalLink(beam);
  addLocalLink(link);
  return { status: "saved", link };
}
