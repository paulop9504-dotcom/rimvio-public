import type { LinkRow } from "@/types/database";

const hour = 60 * 60 * 1000;
const day = 24 * hour;

/** Dev/demo feed — diverse domains & action shapes */
export const demoSampleLinks: LinkRow[] = [
  {
    id: "demo-youtube",
    user_id: null,
    original_url: "https://www.youtube.com/watch?v=yfHasxI_s2A",
    title: "케챠비들✨ 숙소대첩 곧 오픈!!",
    thumbnail_url: null,
    domain: "youtube.com",
    category: "media",
    actions: [
      {
        id: "d1",
        label: "▶️ 영상 바로 재생",
        kind: "open",
        href: "https://www.youtube.com/watch?v=yfHasxI_s2A",
        payload: { icon: "youtube" },
      },
      {
        id: "d2",
        label: "🔗 open.kakao.com",
        kind: "open",
        href: "https://open.kakao.com/o/gsXxUJui",
        payload: { icon: "link" },
      },
      {
        id: "d3",
        label: "🔗 yo-go.co.kr",
        kind: "open",
        href: "https://yo-go.co.kr/",
        payload: { icon: "link" },
      },
    ],
    created_at: new Date(Date.now() - hour).toISOString(),
    expires_at: new Date(Date.now() + 7 * day).toISOString(),
  },
  {
    id: "demo-map",
    user_id: null,
    original_url: "https://map.naver.com/p/search/강릉%20세인트존스",
    title: "강릉 세인트존스 호텔",
    thumbnail_url: null,
    domain: "map.naver.com",
    category: "travel",
    actions: [
      {
        id: "d4",
        label: "카카오맵 바로 열기",
        kind: "open",
        href: "https://map.kakao.com/link/map/https://map.naver.com/p/search/%EA%B0%95%EB%A6%89%20%EC%84%B8%EC%9D%B8%ED%8A%B8%EC%A1%B4%EC%A6%88",
        payload: { icon: "kakaomap" },
      },
      {
        id: "d5",
        label: "원본 열기",
        kind: "open",
        href: "https://map.naver.com/p/search/강릉%20세인트존스",
        payload: { icon: "external-link" },
      },
    ],
    created_at: new Date(Date.now() - 2 * hour).toISOString(),
    expires_at: new Date(Date.now() + 5 * day).toISOString(),
  },
  {
    id: "demo-yogo",
    user_id: null,
    original_url: "https://yo-go.co.kr/",
    title: "요고 타임딜 — 최대 60% 할인",
    thumbnail_url:
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=256&h=256&fit=crop",
    domain: "yo-go.co.kr",
    category: "shopping",
    actions: [
      {
        id: "d6",
        label: "🛒 타임딜 열기",
        kind: "open",
        href: "https://yo-go.co.kr/",
        payload: { icon: "link" },
      },
      {
        id: "d7",
        label: "🎁 플친 쿠폰",
        kind: "open",
        href: "https://pf.kakao.com/_mktxaK",
        payload: { icon: "link" },
      },
    ],
    created_at: new Date(Date.now() - 3 * hour).toISOString(),
    expires_at: new Date(Date.now() + 2 * day).toISOString(),
  },
  {
    id: "demo-figma",
    user_id: null,
    original_url: "https://www.figma.com/file/design-handoff",
    title: "Review design handoff",
    thumbnail_url:
      "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=256&h=256&fit=crop",
    domain: "figma.com",
    category: "research",
    actions: [
      {
        id: "d8",
        label: "Open in Figma",
        kind: "open",
        href: "https://www.figma.com/file/design-handoff",
        payload: { icon: "external-link" },
      },
    ],
    created_at: new Date(Date.now() - 5 * hour).toISOString(),
    expires_at: new Date(Date.now() + day).toISOString(),
  },
  {
    id: "demo-linear",
    user_id: null,
    original_url: "https://linear.app/team/issue/SCOPE-42",
    title: "Approve sprint scope",
    thumbnail_url:
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=256&h=256&fit=crop",
    domain: "linear.app",
    category: "research",
    actions: [
      {
        id: "d9",
        label: "Open issue",
        kind: "open",
        href: "https://linear.app/team/issue/SCOPE-42",
        payload: { icon: "external-link" },
      },
      {
        id: "d10",
        label: "Share with team",
        kind: "share",
        href: "https://linear.app/team/issue/SCOPE-42",
      },
    ],
    created_at: new Date(Date.now() - 8 * hour).toISOString(),
    expires_at: new Date(Date.now() + 3 * day).toISOString(),
  },
  {
    id: "demo-archive",
    user_id: null,
    original_url: "https://stripe.com/docs/payments/checkout",
    title: "Stripe Checkout guide (expired)",
    thumbnail_url:
      "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=256&h=256&fit=crop",
    domain: "stripe.com",
    category: "research",
    actions: [
      {
        id: "d11",
        label: "Read docs",
        kind: "open",
        href: "https://stripe.com/docs/payments/checkout",
        payload: { icon: "external-link" },
      },
    ],
    created_at: new Date(Date.now() - 10 * day).toISOString(),
    expires_at: new Date(Date.now() - day).toISOString(),
  },
];
