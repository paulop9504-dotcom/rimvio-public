import type { LinkCategory } from "@/lib/categories/types";

export type PortalSuiteActionDef = {
  label: string;
  href: string;
  icon: string;
  category: LinkCategory;
  /** Default order when inbox weights are flat. Lower = higher. */
  priority: number;
};

export type PortalSuiteDef = {
  title: string;
  subtitle: string;
  domain: string;
  actions: PortalSuiteActionDef[];
};

export const PORTAL_ACTION_SUITES: Record<string, PortalSuiteDef> = {
  google: {
    title: "구글",
    subtitle: "검색 · 번역 · 드라이브",
    domain: "google.com",
    actions: [
      {
        label: "🔍 구글 검색",
        href: "https://www.google.com/",
        icon: "external-link",
        category: "research",
        priority: 0,
      },
      {
        label: "🌏 번역하기",
        href: "https://translate.google.com/",
        icon: "external-link",
        category: "research",
        priority: 1,
      },
      {
        label: "📁 드라이브",
        href: "https://drive.google.com/",
        icon: "external-link",
        category: "research",
        priority: 2,
      },
      {
        label: "📅 캘린더",
        href: "https://calendar.google.com/",
        icon: "external-link",
        category: "research",
        priority: 3,
      },
    ],
  },
  naver: {
    title: "네이버",
    subtitle: "뉴스 · 메일 · 지도 · 쇼핑",
    domain: "naver.com",
    actions: [
      {
        label: "📰 뉴스",
        href: "https://news.naver.com/",
        icon: "external-link",
        category: "social",
        priority: 0,
      },
      {
        label: "✉️ 메일",
        href: "https://mail.naver.com/",
        icon: "external-link",
        category: "research",
        priority: 1,
      },
      {
        label: "🗺️ 지도",
        href: "https://map.naver.com/",
        icon: "kakaomap",
        category: "travel",
        priority: 2,
      },
      {
        label: "🛒 쇼핑",
        href: "https://shopping.naver.com/",
        icon: "external-link",
        category: "shopping",
        priority: 3,
      },
    ],
  },
  youtube: {
    title: "YouTube",
    subtitle: "홈 · 구독 · Shorts",
    domain: "youtube.com",
    actions: [
      {
        label: "🏠 YouTube 홈",
        href: "https://www.youtube.com/",
        icon: "youtube",
        category: "media",
        priority: 0,
      },
      {
        label: "📺 구독",
        href: "https://www.youtube.com/feed/subscriptions",
        icon: "youtube",
        category: "media",
        priority: 1,
      },
      {
        label: "📱 Shorts",
        href: "https://www.youtube.com/shorts",
        icon: "youtube",
        category: "media",
        priority: 2,
      },
    ],
  },
  coupang: {
    title: "쿠팡",
    subtitle: "마켓 · 로켓 · 이츠",
    domain: "coupang.com",
    actions: [
      {
        label: "🛒 쿠팡 마켓",
        href: "https://www.coupang.com/",
        icon: "external-link",
        category: "shopping",
        priority: 0,
      },
      {
        label: "🚀 로켓배송",
        href: "https://www.coupang.com/np/campaigns/82",
        icon: "external-link",
        category: "shopping",
        priority: 1,
      },
      {
        label: "🍽 쿠팡이츠",
        href: "https://www.coupang.com/eats",
        icon: "external-link",
        category: "shopping",
        priority: 2,
      },
    ],
  },
  amazon: {
    title: "Amazon",
    subtitle: "쇼핑 · 주문 · Prime",
    domain: "amazon.com",
    actions: [
      {
        label: "🛒 쇼핑 홈",
        href: "https://www.amazon.com/",
        icon: "external-link",
        category: "shopping",
        priority: 0,
      },
      {
        label: "📦 주문 내역",
        href: "https://www.amazon.com/gp/css/order-history",
        icon: "external-link",
        category: "shopping",
        priority: 1,
      },
      {
        label: "⭐ Prime",
        href: "https://www.amazon.com/prime",
        icon: "external-link",
        category: "shopping",
        priority: 2,
      },
    ],
  },
};

export function getPortalSuite(suiteKey: string): PortalSuiteDef | null {
  return PORTAL_ACTION_SUITES[suiteKey] ?? null;
}
