import type { PageMetadata } from "@/lib/enrichers/types";
import type { UrlPageMetadata } from "@/lib/share/scrape-url-metadata";

export function urlPageMetadataToPageMetadata(
  metadata: UrlPageMetadata
): PageMetadata {
  const title = metadata.ogTitle ?? metadata.title;

  return {
    url: metadata.url,
    domain: metadata.domain,
    title,
    image: null,
    description: metadata.ogDescription,
    phone: null,
  };
}
