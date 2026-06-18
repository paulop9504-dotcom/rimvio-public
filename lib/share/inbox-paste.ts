"use client";

import type { BeamSnapshot } from "@/lib/beam/types";
import { saveBeamToPocket } from "@/lib/beam/save-beam-to-pocket";
import { LOCAL_LINKS_UPDATED } from "@/lib/demo/seed";
import {
  addLocalLink,
  buildLocalLink,
  buildLocalLinkFromEnriched,
  readLocalLinks,
  updateLocalLink,
} from "@/lib/local-links/store";
import {
  parseAllManualLinkInputs,
  type ParsedManualLink,
} from "@/lib/share/parse-share-payload";
import { enrichSharedUrl } from "@/lib/share/scrape-shared-link";
import { resolveClientLinkTitle } from "@/lib/share/trusted-link-title";
import { normalizeLinkUrl } from "@/lib/local-links/pinned-link";
import { isCommerceDomain } from "@/lib/enrichers/url-intelligence";
import type { LinkRow } from "@/types/database";

export type InboxPasteResult = {
  added: number;
  skipped: number;
  links: LinkRow[];
};

function notifyLinksUpdated() {
  window.dispatchEvent(new Event(LOCAL_LINKS_UPDATED));
}

function titleFromUrl(url: string) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return host || "Link";
  } catch {
    return "Link";
  }
}

async function resolveBeamSnapshot(slug: string): Promise<BeamSnapshot | null> {
  try {
    const response = await fetch(`/api/beam/${slug}`, { cache: "no-store" });
    if (!response.ok) {
      return null;
    }

    return (await response.json()) as BeamSnapshot;
  } catch {
    return null;
  }
}

function linkAlreadyExists(url: string) {
  const normalized = normalizeLinkUrl(url);
  return readLocalLinks().some(
    (link) => normalizeLinkUrl(link.original_url) === normalized
  );
}

function saveParsedLink(parsed: ParsedManualLink): LinkRow | null {
  if (linkAlreadyExists(parsed.url)) {
    return null;
  }

  const link = buildLocalLink({
    originalUrl: parsed.url,
    title: resolveClientLinkTitle(
      parsed.url,
      parsed.title,
      titleFromUrl(parsed.url)
    ),
    shareSlug: parsed.beamSlug,
  });
  addLocalLink(link);
  return link;
}

async function ingestBeamLink(parsed: ParsedManualLink): Promise<LinkRow | null> {
  if (!parsed.beamSlug) {
    return saveParsedLink(parsed);
  }

  const existing = readLocalLinks().find(
    (link) =>
      link.share_slug === parsed.beamSlug || link.original_url === parsed.url
  );
  if (existing) {
    return null;
  }

  const beam = await resolveBeamSnapshot(parsed.beamSlug);
  if (beam) {
    const result = saveBeamToPocket(beam);
    return result.status === "saved" ? result.link : null;
  }

  return saveParsedLink(parsed);
}

function enrichInBackground(link: LinkRow) {
  void (async () => {
    let host = link.domain;
    try {
      host = new URL(link.original_url).hostname.replace(/^www\./, "");
    } catch {
      // Keep stored domain.
    }

    const maxAttempts = isCommerceDomain(host) ? 2 : 1;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      try {
        const enriched = await enrichSharedUrl(link.original_url);
        const fresh = buildLocalLinkFromEnriched(enriched);
        updateLocalLink(link.id, {
          title: fresh.title,
          thumbnail_url: fresh.thumbnail_url,
          domain: fresh.domain,
          category: fresh.category,
          actions: fresh.actions,
          visual_mode: fresh.visual_mode,
          source_type: fresh.source_type,
        });
        notifyLinksUpdated();
        return;
      } catch {
        if (attempt + 1 >= maxAttempts) {
          // Keep the fast stub link.
        }
      }
    }
  })();
}

export async function ingestPastedLinks(raw: string): Promise<InboxPasteResult> {
  const parsed = parseAllManualLinkInputs(raw);
  if (parsed.length === 0) {
    return { added: 0, skipped: 0, links: [] };
  }

  const links: LinkRow[] = [];
  let skipped = 0;

  for (const item of parsed) {
    const saved = item.beamSlug
      ? await ingestBeamLink(item)
      : saveParsedLink(item);

    if (saved) {
      links.push(saved);
      if (!item.beamSlug) {
        enrichInBackground(saved);
      }
    } else {
      skipped += 1;
    }
  }

  if (links.length > 0) {
    notifyLinksUpdated();
  }

  return { added: links.length, skipped, links };
}
