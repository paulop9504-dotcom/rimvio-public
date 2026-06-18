import { normalizeLinkCategory, type LinkCategory } from "@/lib/categories/types";
import {
  getDomainGradient,
  getDomainInitial,
  getDomainTitle,
} from "@/lib/utils/domain-gradient";
import type { LinkRow } from "@/types/database";

export type LinkBrandArt = {
  emoji: string;
  gradient: string;
  displayName: string;
  useFavicon: boolean;
  category: LinkCategory;
};

type BrandRule = {
  pattern: RegExp;
  emoji: string;
  gradient: string;
  displayName?: string;
};

const DOMAIN_BRAND_RULES: BrandRule[] = [
  {
    pattern: /youtube|youtu\.be/i,
    emoji: "▶️",
    gradient: "from-red-500/95 via-rose-600/90 to-red-950/95",
    displayName: "YouTube",
  },
  {
    pattern: /netflix/i,
    emoji: "🎬",
    gradient: "from-[#E50914] via-[#B20710] to-black",
    displayName: "Netflix",
  },
  {
    pattern: /tving/i,
    emoji: "📺",
    gradient: "from-[#FF153C] via-[#E60026] to-[#1a0a12]",
    displayName: "TVING",
  },
  {
    pattern: /interpark|ticketlink|melon\.com/i,
    emoji: "🎫",
    gradient: "from-violet-600/95 via-fuchsia-600/90 to-indigo-950/95",
    displayName: "티켓",
  },
  {
    pattern: /naver/i,
    emoji: "🟢",
    gradient: "from-emerald-500/95 via-green-600/90 to-emerald-950/95",
    displayName: "Naver",
  },
  {
    pattern: /kakao|daum/i,
    emoji: "💬",
    gradient: "from-[#FEE500]/90 via-[#F5D300]/85 to-[#3C1E1E]/95",
    displayName: "Kakao",
  },
  {
    pattern: /coupang/i,
    emoji: "🛒",
    gradient: "from-[#0074E9]/95 via-[#005BB5]/90 to-[#0B1F3A]/95",
    displayName: "Coupang",
  },
  {
    pattern: /joongna|junggo/i,
    emoji: "🛒",
    gradient: "from-emerald-500/90 via-emerald-600/90 to-emerald-900/95",
    displayName: "중고나라",
  },
  {
    pattern: /bunjang/i,
    emoji: "⚡",
    gradient: "from-[#FF4D4F] via-[#E63E40] to-[#B91C1C]",
    displayName: "번개장터",
  },
  {
    pattern: /daangn|karrot/i,
    emoji: "🥕",
    gradient: "from-orange-400/95 via-orange-500/90 to-orange-700/95",
    displayName: "당근",
  },
  {
    pattern: /musinsa|11st|gmarket|yo-go/i,
    emoji: "👕",
    gradient: "from-orange-500/90 via-amber-600/85 to-orange-950/95",
    displayName: "Shopping",
  },
  {
    pattern: /baemin|yogiyo|eats/i,
    emoji: "🍔",
    gradient: "from-[#2AC1BC]/95 via-teal-600/90 to-cyan-950/95",
    displayName: "Delivery",
  },
  {
    pattern: /github/i,
    emoji: "🐙",
    gradient: "from-[#24292f] via-[#1b1f23] to-black",
    displayName: "GitHub",
  },
  {
    pattern: /figma/i,
    emoji: "🎨",
    gradient: "from-[#A259FF]/90 via-[#F24E1E]/85 to-[#1E1E1E]/95",
    displayName: "Figma",
  },
  {
    pattern: /google/i,
    emoji: "🔍",
    gradient: "from-sky-500/90 via-blue-600/85 to-indigo-950/95",
    displayName: "Google",
  },
  {
    pattern: /airbnb|yanolja|booking|agoda|trip\.com/i,
    emoji: "🏨",
    gradient: "from-rose-500/90 via-orange-500/85 to-amber-950/95",
    displayName: "Travel",
  },
  {
    pattern: /map\.(kakao|naver)/i,
    emoji: "🗺️",
    gradient: "from-blue-500/90 via-indigo-600/85 to-slate-950/95",
    displayName: "Map",
  },
  {
    pattern: /wikipedia/i,
    emoji: "📚",
    gradient: "from-slate-600/90 via-slate-800/85 to-black/95",
    displayName: "Wikipedia",
  },
  {
    pattern: /amazon/i,
    emoji: "📦",
    gradient: "from-amber-500/90 via-orange-600/85 to-zinc-950/95",
    displayName: "Amazon",
  },
];

const CATEGORY_EMOJI: Record<LinkCategory, string> = {
  media: "🎬",
  shopping: "🛒",
  travel: "✈️",
  research: "🔍",
  social: "💬",
  uncategorized: "🔗",
};

const CATEGORY_GRADIENT: Partial<Record<LinkCategory, string>> = {
  media: "from-violet-600/90 via-fuchsia-600/85 to-purple-950/95",
  shopping: "from-orange-500/90 via-amber-600/85 to-orange-950/95",
  travel: "from-sky-500/90 via-cyan-600/85 to-blue-950/95",
  research: "from-slate-600/90 via-zinc-700/85 to-slate-950/95",
  social: "from-pink-500/90 via-rose-600/85 to-rose-950/95",
};

function normalizeDomain(domain: string) {
  return domain.trim().toLowerCase().replace(/^www\./, "");
}

export function faviconUrl(domain: string, size = 128) {
  const host = normalizeDomain(domain);

  if (/naver\.com|naver\.me/i.test(host)) {
    return "https://www.naver.com/favicon.ico";
  }

  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=${size}`;
}

export function isBrokenThumbnailUrl(url: string | null | undefined) {
  if (!url?.trim()) {
    return true;
  }

  const trimmed = url.trim();

  if (trimmed.includes("&#") || trimmed.includes("%26%23")) {
    return true;
  }

  if (!/^https?:\/\//i.test(trimmed)) {
    return true;
  }

  return false;
}

/** OG images that crop badly as hero — use brand poster instead. */
export function shouldPreferBrandPoster(
  thumbnailUrl: string | null | undefined,
  domain: string
) {
  if (isBrokenThumbnailUrl(thumbnailUrl)) {
    return true;
  }

  const url = thumbnailUrl!.toLowerCase();
  const host = normalizeDomain(domain);

  if (/staticmap|maps\.google|google\.com\/maps/i.test(url)) {
    return true;
  }

  if (/ogtag|og[_-]?thumbnail|common\/og|scrap_sv|opengraph\.githubassets/i.test(url)) {
    return true;
  }

  if (/tving_log|trip-og-image|baemin-og/i.test(url)) {
    return true;
  }

  if (/localimg\/localimages/i.test(url) && host.includes("kakao")) {
    return true;
  }

  return false;
}

/** Soft blurred background only — never the main focal crop. */
export function resolveAmbienceThumbnail(link: Pick<LinkRow, "thumbnail_url" | "domain">) {
  if (!link.thumbnail_url || isBrokenThumbnailUrl(link.thumbnail_url)) {
    return null;
  }

  if (shouldPreferBrandPoster(link.thumbnail_url, link.domain)) {
    return null;
  }

  const url = link.thumbnail_url.toLowerCase();

  if (/upload\.wikimedia|wikipedia/i.test(url)) {
    return link.thumbnail_url;
  }

  if (/muscache|airbnb|unsplash/i.test(url)) {
    return link.thumbnail_url;
  }

  return null;
}

export function resolveLinkBrand(
  link: Pick<LinkRow, "domain" | "category">
): LinkBrandArt {
  const domain = normalizeDomain(link.domain);
  const category = normalizeLinkCategory(link.category);
  const target = `${domain} ${link.domain}`;

  for (const rule of DOMAIN_BRAND_RULES) {
    if (rule.pattern.test(target)) {
      return {
        emoji: rule.emoji,
        gradient: rule.gradient,
        displayName: rule.displayName ?? getDomainTitle(domain),
        useFavicon: true,
        category,
      };
    }
  }

  return {
    emoji: CATEGORY_EMOJI[category],
    gradient: CATEGORY_GRADIENT[category] ?? getDomainGradient(domain),
    displayName: getDomainTitle(domain),
    useFavicon: true,
    category,
  };
}

export function resolveBrandInitial(domain: string) {
  return getDomainInitial(domain);
}
