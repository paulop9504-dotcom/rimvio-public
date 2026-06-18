import { buildTmapNavigateHref } from "@/lib/actions/domain-deep-links";
import type { MapLaunchContext } from "@/lib/resolvers/map-app-launch";
import {
  buildAppleMapsNavigateHref,
  buildEntityNavigateHref,
  buildMapAppFallbackHref,
  resolveEntityNavigateContext,
  resolveMapLaunchContext,
} from "@/lib/resolvers/map-app-launch";
import {
  buildKakaoMapSearchWebHref,
  buildNaverMapSearchWebHref,
} from "@/lib/resolvers/deep-links";
import { toActionFamily } from "@/lib/personalization/action-family";
import type { LinkActionItem, LinkRow } from "@/types/database";

export const NAV_SECTOR_STORAGE_KEY = "rimvio.nav-sector.v1";
export const NAV_SECTOR_UPDATED = "rimvio-nav-sector-updated";

export type NavSectorProvider =
  | "tmap"
  | "naver"
  | "kakao"
  | "kakao-navi"
  | "google"
  | "apple";

export type NavSectorDestination = {
  placeName?: string | null;
  navAddress?: string | null;
  query: string;
  domestic: boolean;
};

export type NavSectorOption = {
  id: NavSectorProvider;
  label: string;
  emoji: string;
  hint: string;
  href: string;
  fallbackHref?: string | null;
};

type NavSectorState = {
  usage: Partial<Record<NavSectorProvider, number>>;
  hidden: NavSectorProvider[];
  totalOpens: number;
};

const ALL_PROVIDERS: NavSectorProvider[] = [
  "tmap",
  "naver",
  "kakao",
  "kakao-navi",
  "google",
  "apple",
];

const NAV_SECTOR_META: Record<
  NavSectorProvider,
  Pick<NavSectorOption, "label" | "emoji" | "hint">
> = {
  tmap: {
    label: "T map",
    emoji: "🚗",
    hint: "자동차 내비 · 국내에서 많이 씀",
  },
  naver: {
    label: "네이버 지도",
    emoji: "🟢",
    hint: "길찾기 · 대중교통·리뷰",
  },
  kakao: {
    label: "카카오맵",
    emoji: "💛",
    hint: "길찾기 · 카카오T 연동",
  },
  "kakao-navi": {
    label: "카카오내비",
    emoji: "🧭",
    hint: "자동차 전용 · 카카오맵 경유",
  },
  google: {
    label: "Google Maps",
    emoji: "🔵",
    hint: "해외·글로벌 장소",
  },
  apple: {
    label: "Apple 지도",
    emoji: "🍎",
    hint: "iPhone · CarPlay",
  },
};

const AUTO_HIDE_MIN_OPENS = 6;

function defaultNavSectorState(): NavSectorState {
  return { usage: {}, hidden: [], totalOpens: 0 };
}

function readNavSectorState(): NavSectorState {
  if (typeof window === "undefined") {
    return defaultNavSectorState();
  }

  try {
    const raw = localStorage.getItem(NAV_SECTOR_STORAGE_KEY);
    if (!raw) {
      return defaultNavSectorState();
    }

    const parsed = JSON.parse(raw) as Partial<NavSectorState>;
    return {
      usage: parsed.usage ?? {},
      hidden: Array.isArray(parsed.hidden) ? parsed.hidden : [],
      totalOpens: typeof parsed.totalOpens === "number" ? parsed.totalOpens : 0,
    };
  } catch {
    return defaultNavSectorState();
  }
}

function writeNavSectorState(state: NavSectorState) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.setItem(NAV_SECTOR_STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent(NAV_SECTOR_UPDATED));
  } catch {
    // ignore
  }
}

export function recordNavSectorUse(provider: NavSectorProvider) {
  const state = readNavSectorState();
  state.usage[provider] = (state.usage[provider] ?? 0) + 1;
  state.totalOpens += 1;

  if (state.totalOpens >= AUTO_HIDE_MIN_OPENS) {
    const usedIds = ALL_PROVIDERS.filter((id) => (state.usage[id] ?? 0) > 0);
    if (usedIds.length >= 1) {
      for (const id of ALL_PROVIDERS) {
        if ((state.usage[id] ?? 0) === 0 && !state.hidden.includes(id)) {
          state.hidden.push(id);
        }
      }
    }
  }

  writeNavSectorState(state);
}

export function hideNavSectorProvider(provider: NavSectorProvider) {
  const state = readNavSectorState();
  if (!state.hidden.includes(provider)) {
    state.hidden.push(provider);
    writeNavSectorState(state);
  }
}

export function defaultNavSectorOrder(domestic: boolean): NavSectorProvider[] {
  if (domestic) {
    return ["tmap", "naver", "kakao", "kakao-navi", "google", "apple"];
  }

  return ["apple", "google", "naver", "kakao", "tmap", "kakao-navi"];
}

function buildKakaoNaviHref(query: string) {
  const trimmed = query.trim();
  if (!trimmed) {
    return buildKakaoMapSearchWebHref("");
  }

  return `https://map.kakao.com/link/to/${encodeURIComponent(trimmed)}`;
}

function resolveQuery(destination: NavSectorDestination) {
  const fromParts = [destination.placeName, destination.navAddress].filter(Boolean).join(" ").trim();
  return fromParts || destination.query.trim();
}

export function buildNavSectorOptions(destination: NavSectorDestination): NavSectorOption[] {
  const query = resolveQuery(destination);
  const placeName = destination.placeName?.trim() || query;
  const navAddress = destination.navAddress?.trim() || null;

  const options: NavSectorOption[] = [
    {
      id: "tmap",
      ...NAV_SECTOR_META.tmap,
      href: buildTmapNavigateHref(placeName, navAddress),
      fallbackHref: buildNaverMapSearchWebHref(query),
    },
    {
      id: "naver",
      ...NAV_SECTOR_META.naver,
      href: buildEntityNavigateHref("naver", { placeName, navAddress }),
      fallbackHref: buildNaverMapSearchWebHref(query),
    },
    {
      id: "kakao",
      ...NAV_SECTOR_META.kakao,
      href: buildEntityNavigateHref("kakao", { placeName, navAddress }),
      fallbackHref: buildKakaoMapSearchWebHref(query),
    },
    {
      id: "kakao-navi",
      ...NAV_SECTOR_META["kakao-navi"],
      href: buildKakaoNaviHref(query),
      fallbackHref: buildKakaoMapSearchWebHref(query),
    },
    {
      id: "google",
      ...NAV_SECTOR_META.google,
      href: buildEntityNavigateHref("google", { placeName, navAddress }),
      fallbackHref: null,
    },
    {
      id: "apple",
      ...NAV_SECTOR_META.apple,
      href: buildAppleMapsNavigateHref(query),
      fallbackHref: null,
    },
  ];

  return orderNavSectorOptions(options, destination.domestic);
}

export function orderNavSectorOptions(
  options: NavSectorOption[],
  domestic: boolean,
  state: NavSectorState = readNavSectorState()
): NavSectorOption[] {
  const hidden = new Set(state.hidden);
  const visible = options.filter((option) => !hidden.has(option.id));
  const defaultOrder = defaultNavSectorOrder(domestic);

  return visible.sort((left, right) => {
    const leftUsage = state.usage[left.id] ?? 0;
    const rightUsage = state.usage[right.id] ?? 0;

    if (leftUsage !== rightUsage) {
      return rightUsage - leftUsage;
    }

    return defaultOrder.indexOf(left.id) - defaultOrder.indexOf(right.id);
  });
}

export function navSectorUsageCount(provider: NavSectorProvider) {
  return readNavSectorState().usage[provider] ?? 0;
}

export function isNavSectorAction(action: LinkActionItem) {
  if (action.payload?.navSector === true || action.payload?.entityNavigate === true) {
    return true;
  }

  if (toActionFamily(action) !== "map_navigate") {
    return false;
  }

  const haystack = `${action.label} ${action.href ?? ""}`;
  return /길찾|네비|navigation|navigate|tmap:|nmap:|kakaomap|maps\.apple|google\.com\/maps/i.test(
    haystack
  );
}

export function resolveNavSectorDestination(
  action: LinkActionItem,
  link?: Pick<LinkRow, "original_url" | "title" | "category"> | null
): NavSectorDestination {
  const payload = action.payload ?? {};
  const payloadPlace =
    typeof payload.navPlaceName === "string" ? payload.navPlaceName.trim() : "";
  const payloadAddress =
    typeof payload.navAddress === "string" ? payload.navAddress.trim() : "";

  if (payloadPlace || payloadAddress) {
    const query = [payloadPlace, payloadAddress].filter(Boolean).join(" ").trim();
    return {
      placeName: payloadPlace || null,
      navAddress: payloadAddress || null,
      query: query || action.label,
      domestic: true,
    };
  }

  if (link) {
    const ctx = resolveMapLaunchContext(link, action);
    const query =
      typeof payload.copyText === "string" && payload.copyText.trim()
        ? payload.copyText.trim()
        : ctx.query;

    return {
      query,
      placeName: query,
      navAddress: null,
      domestic: ctx.domestic,
    };
  }

  const ctx = resolveEntityNavigateContext(action);
  return {
    query: ctx.query,
    placeName: ctx.query,
    navAddress: null,
    domestic: ctx.domestic,
  };
}

export function destinationFromMapLaunchContext(
  context: MapLaunchContext
): NavSectorDestination {
  return {
    query: context.query,
    placeName: context.query,
    navAddress: null,
    domestic: context.domestic,
  };
}

export function buildNavSectorFallbackForMapApp(
  app: Extract<NavSectorProvider, "naver" | "kakao" | "google" | "apple">,
  context: MapLaunchContext
) {
  if (app === "naver" || app === "kakao" || app === "google" || app === "apple") {
    return buildMapAppFallbackHref(app, context);
  }

  return null;
}
