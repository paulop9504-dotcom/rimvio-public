import type { LinkActionItem, LinkRow } from "@/types/database";
import { resolveCategory } from "@/lib/categories/resolve-category";
import type { EnrichedLink } from "@/lib/enrichers/types";
import { buildVisualFieldsFromEnriched } from "@/lib/feed/feed-visual";
import { sanitizeLinkTitle } from "@/lib/feed/sanitize-link-title";
import { registerBeamSnapshot } from "@/lib/beam/register-beam";
import { createShareSlug } from "@/lib/share/share-slug";
import { exportFeedBackup, parseFeedBackup } from "@/lib/links/feed-backup";
import { normalizeLinkReadAloudActions } from "@/lib/actions/read-aloud-action";
import { recordSaveTrajectoryEntry } from "@/lib/intent/save-trajectory-client";
import { toDomainFamily } from "@/lib/personalization/action-family";
import { recordLocalLinkSave } from "@/lib/personalization/client-store";
import { dismissSampleFeedIfRealLinkAdded } from "@/lib/onboarding/sample-feed";
import { sharedLinkExpiresAt } from "@/lib/share/scrape-shared-link";

const STORAGE_KEY = "blink-local-links";
const DISMISSED_KEY = "blink-dismissed-link-ids";
const LEGACY_SESSION_KEY = STORAGE_KEY;
const LEGACY_DISMISSED_SESSION_KEY = DISMISSED_KEY;

function readJsonStorage(key: string, legacySessionKey?: string) {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const fromLocal = localStorage.getItem(key);
    if (fromLocal) {
      return fromLocal;
    }

    if (legacySessionKey) {
      const fromSession = sessionStorage.getItem(legacySessionKey);
      if (fromSession) {
        localStorage.setItem(key, fromSession);
        sessionStorage.removeItem(legacySessionKey);
        return fromSession;
      }
    }
  } catch {
    return null;
  }

  return null;
}

function writeJsonStorage(key: string, value: string) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(key, value);
}

export function readDismissedLinkIds(): Set<string> {
  const raw = readJsonStorage(DISMISSED_KEY, LEGACY_DISMISSED_SESSION_KEY);
  if (!raw) {
    return new Set();
  }

  try {
    const parsed = JSON.parse(raw) as string[];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

export function addDismissedLinkId(id: string) {
  const dismissed = readDismissedLinkIds();
  dismissed.add(id);
  writeJsonStorage(DISMISSED_KEY, JSON.stringify([...dismissed]));
}

export function removeDismissedLinkId(id: string) {
  const dismissed = readDismissedLinkIds();
  if (!dismissed.delete(id)) {
    return;
  }

  writeJsonStorage(DISMISSED_KEY, JSON.stringify([...dismissed]));
}

export function clearDismissedLinkIds() {
  writeJsonStorage(DISMISSED_KEY, "[]");
}

export function writeLocalLinks(links: LinkRow[]) {
  writeJsonStorage(STORAGE_KEY, JSON.stringify(links));
}

export function removeLocalLink(id: string) {
  const next = readLocalLinks().filter((item) => item.id !== id);
  writeLocalLinks(next);
}

function sanitizeStoredLink(link: LinkRow): LinkRow {
  const title = sanitizeLinkTitle({
    title: link.title,
    original_url: link.original_url,
    domain: link.domain,
    source_type: link.source_type,
    category: link.category,
  });

  const normalized = normalizeLinkReadAloudActions(
    title === link.title ? link : { ...link, title }
  );

  return normalized;
}

export function readLocalLinks(): LinkRow[] {
  const raw = readJsonStorage(STORAGE_KEY, LEGACY_SESSION_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as LinkRow[];
    return Array.isArray(parsed) ? parsed.map(sanitizeStoredLink) : [];
  } catch {
    return [];
  }
}

export function addLocalLink(link: LinkRow) {
  dismissSampleFeedIfRealLinkAdded(link);

  const existing = readLocalLinks().filter(
    (item) => item.original_url !== link.original_url
  );

  writeLocalLinks([link, ...existing]);

  recordSaveTrajectoryEntry({
    timestamp: link.created_at,
    category: link.category ?? "uncategorized",
    title: link.title,
    domain: link.domain,
    source_type: link.source_type,
  });

  if (typeof window !== "undefined") {
    recordLocalLinkSave({
      linkId: link.id,
      domainFamily: toDomainFamily(link.domain, link.category),
      linkCategory: link.category,
      savedAt: link.created_at,
    });
  }
}

export function exportLocalLinksJson(links?: LinkRow[]) {
  return exportFeedBackup(links ?? readLocalLinks());
}

export function importLocalLinks(raw: string): LinkRow[] {
  const incoming = parseFeedBackup(raw);
  const byUrl = new Map(readLocalLinks().map((link) => [link.original_url, link]));

  for (const link of incoming) {
    if (!link.original_url?.trim() || !link.title?.trim()) {
      continue;
    }

    const normalized: LinkRow = {
      ...link,
      id: link.id?.startsWith("local-") ? link.id : `local-${crypto.randomUUID()}`,
      user_id: null,
    };

    byUrl.set(normalized.original_url, normalized);
  }

  const merged = [...byUrl.values()].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  writeLocalLinks(merged);
  return merged;
}

function defaultActions(originalUrl: string): LinkActionItem[] {
  return [
    {
      id: crypto.randomUUID(),
      label: "원본 열기",
      kind: "open",
      href: originalUrl,
      payload: { icon: "external-link", fallbackHref: originalUrl },
    },
  ];
}

export function updateLocalLink(id: string, patch: Partial<LinkRow>) {
  const links = readLocalLinks();
  const index = links.findIndex((item) => item.id === id);

  if (index < 0) {
    return null;
  }

  const next = { ...links[index], ...patch };
  links[index] = next;
  writeLocalLinks(links);
  return next;
}

export function findLocalLinkByShareSlug(slug: string) {
  return readLocalLinks().find((link) => link.share_slug === slug) ?? null;
}

export function buildLocalLink(input: {
  originalUrl: string;
  title: string;
  category?: string | null;
  thumbnailUrl?: string | null;
  expiresAt?: string | null;
  actions?: LinkActionItem[];
  visualMode?: LinkRow["visual_mode"];
  sourceType?: LinkRow["source_type"];
  shareSlug?: string | null;
  linkStatus?: LinkRow["link_status"];
  roomId?: string | null;
}): LinkRow {
  const now = new Date().toISOString();

  let domain = "link";
  try {
    domain = new URL(input.originalUrl).hostname.replace(/^www\./, "");
  } catch {
    // Keep fallback domain.
  }

  return {
    id: `local-${crypto.randomUUID()}`,
    user_id: null,
    original_url: input.originalUrl,
    title: input.title,
    thumbnail_url: input.thumbnailUrl ?? null,
    domain,
    category: input.category ?? "uncategorized",
    actions: input.actions?.length
      ? input.actions
      : defaultActions(input.originalUrl),
    visual_mode: input.visualMode ?? null,
    source_type: input.sourceType ?? null,
    share_slug: input.shareSlug ?? createShareSlug(),
    link_status: input.linkStatus ?? "open",
    room_id: input.roomId ?? null,
    created_at: now,
    expires_at: input.expiresAt ?? null,
  };
}

export function buildLocalLinkFromEnriched(enriched: EnrichedLink): LinkRow {
  const visual = buildVisualFieldsFromEnriched(enriched);

  const link = buildLocalLink({
    originalUrl: enriched.url,
    title: sanitizeLinkTitle({
      title: enriched.title,
      original_url: enriched.url,
      domain: enriched.domain,
      source_type: visual.source_type,
      category: resolveCategory(enriched),
    }),
    thumbnailUrl: enriched.image,
    category: resolveCategory(enriched),
    expiresAt: sharedLinkExpiresAt(),
    actions: enriched.actions,
    visualMode: visual.visual_mode,
    sourceType: visual.source_type,
  });

  void registerBeamSnapshot(link);
  return link;
}
