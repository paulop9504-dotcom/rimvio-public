import { RIMVIO } from "@/lib/brand/rimvio";

/** App Store / Play Store / OG listing copy — single source of truth. */
export const STORE_META = {
  shortDescription:
    "하루의 사진·위치·대화를 기억하고, 다음 일을 이어주는 Experience OS",
  longDescription:
    "Rimvio(림비오)는 사용자의 경험을 시간·장소·사람·행동 단위로 구조화하고, 쌓인 맥락으로 다음 행동을 제안·실행하는 Experience OS입니다. 하루 동안 남겨진 사진, 위치, 대화를 기억하고, 피드에서 오늘의 경험을 확인한 뒤 맛집·길찾기·@명령을 맥락 안에서 실행할 수 있어요. 챗봇·북마크 앱이 아닙니다. 자동 실행 없음 — Human decides, tap to run.",
  keywords: [
    "링크",
    "할일",
    "정리",
    "공유",
    "PWA",
    "림비오",
    "Rimvio",
    "bookmark",
    "productivity",
  ],
  category: "productivity",
  ogImage: "/store/og-cover.png",
  icons: {
    p192: "/icons/icon-192.png",
    p512: "/icons/icon-512.png",
  },
  screenshots: {
    /** 스토어 1장: 대화 + Lens 말풍선 */
    peers: {
      path: "/store/peers-mobile.png",
      width: 390,
      height: 844,
      label: "친구 — 대화에서 실행 버튼",
    },
    /** 스토어 2장: 링크 Shorts → Dock */
    feed: {
      path: "/store/feed-mobile.png",
      width: 390,
      height: 844,
      label: "실행 — 링크를 실행 카드로",
    },
    /** 스토어 3장: 온보딩·한 문장 */
    welcome: {
      path: "/store/welcome-mobile.png",
      width: 390,
      height: 844,
      label: "말하고, 공유하고 — 실행은 탭 한 번",
    },
  },
} as const;

export function storeAbsoluteUrl(pathname: string) {
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    `https://${RIMVIO.domain}`;
  return `${base}${pathname.startsWith("/") ? pathname : `/${pathname}`}`;
}
