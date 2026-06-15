import { LINK_CATEGORY_LABELS, normalizeLinkCategory } from "@/lib/categories/types";
import { localizeFeedActionLabel } from "@/lib/i18n/localize-action-label";
import type { AppLocale } from "@/lib/i18n/types";
import { resolveLinkBrand } from "@/lib/feed/link-brand-art";
import { getDisplayTitleForLink } from "@/lib/feed/sanitize-link-title";
import type { LinkRow } from "@/types/database";

/** Human site name — never raw host like netflix.com */
export function getFeedSiteLabel(link: Pick<LinkRow, "domain" | "category">) {
  return resolveLinkBrand(link).displayName;
}

/** Subtitle under title — null when redundant or too technical */
export function getFeedSubtitle(link: LinkRow): string | null {
  const siteLabel = getFeedSiteLabel(link);
  const displayTitle = getDisplayTitleForLink(link);

  if (!siteLabel) {
    return null;
  }

  if (displayTitle && displayTitle.toLowerCase() === siteLabel.toLowerCase()) {
    return null;
  }

  if (/\.[a-z]{2,}(?:\/|$)/i.test(siteLabel)) {
    return null;
  }

  return siteLabel;
}

export function getFeedCategoryLabel(
  category: string | null | undefined
): string | null {
  if (!category?.trim()) {
    return null;
  }

  const normalized = normalizeLinkCategory(category);
  return LINK_CATEGORY_LABELS[normalized];
}

/** Action label without leading emoji / symbol clutter */
export function cleanFeedActionLabel(label: string, locale?: AppLocale) {
  const cleaned = label
    .replace(
      /^[\s\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}\u{20E3}\u{E0020}-\u{E007F}]+/u,
      ""
    )
    .replace(/^[^\p{L}\p{N}]+/u, "")
    .trim();

  if (locale && locale !== "ko") {
    return localizeFeedActionLabel(label, locale);
  }

  return cleaned;
}

export function isOpenOriginalAction(label: string) {
  return /그 페이지로 가기|원본 열기|원본 페이지/i.test(label);
}
