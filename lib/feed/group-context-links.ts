import { isMapDomain } from "@/lib/enrichers/map";
import { isCommerceDomain } from "@/lib/enrichers/url-intelligence";
import { isScreenshotLink } from "@/lib/share/ingest-screenshot";
import type { LinkRow } from "@/types/database";

export type ContextLinkGroupKind =
  | "photo"
  | "map"
  | "commerce"
  | "article"
  | "video"
  | "link";

export type ContextLinkGroup = {
  kind: ContextLinkGroupKind;
  label: string;
  links: LinkRow[];
};

const GROUP_ORDER: ContextLinkGroupKind[] = [
  "photo",
  "map",
  "commerce",
  "article",
  "video",
  "link",
];

const GROUP_LABELS: Record<ContextLinkGroupKind, string> = {
  photo: "사진",
  map: "지도·장소",
  commerce: "쇼핑·배달",
  article: "기사·뉴스",
  video: "영상",
  link: "링크",
};

const NEWS_DOMAIN =
  /(?:news|naver\.com\/news|daum\.net|ytn|kbs|sbs|mbc|jtbc|chosun|donga|hani|mk\.co)/iu;

function isNewsLink(link: LinkRow): boolean {
  if (link.source_type === "article") {
    return true;
  }
  if (link.category === "news") {
    return true;
  }
  return NEWS_DOMAIN.test(link.domain) || NEWS_DOMAIN.test(link.original_url);
}

export function classifyContextLink(link: LinkRow): ContextLinkGroupKind {
  if (link.source_type === "screenshot" || isScreenshotLink(link)) {
    return "photo";
  }
  if (link.source_type === "map" || isMapDomain(link.domain)) {
    return "map";
  }
  if (link.source_type === "commerce" || isCommerceDomain(link.domain)) {
    return "commerce";
  }
  if (isNewsLink(link)) {
    return "article";
  }
  if (link.source_type === "video") {
    return "video";
  }
  return "link";
}

/** Group captured links by kind — photos together, links together, etc. */
export function groupContextLinks(links: LinkRow[]): ContextLinkGroup[] {
  const buckets = new Map<ContextLinkGroupKind, LinkRow[]>();

  for (const link of links) {
    const kind = classifyContextLink(link);
    const bucket = buckets.get(kind) ?? [];
    bucket.push(link);
    buckets.set(kind, bucket);
  }

  return GROUP_ORDER.filter((kind) => (buckets.get(kind)?.length ?? 0) > 0).map((kind) => ({
    kind,
    label: GROUP_LABELS[kind],
    links: buckets.get(kind)!,
  }));
}
