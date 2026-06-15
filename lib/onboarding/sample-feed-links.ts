import { buildMarketCompareActions } from "@/lib/markets/build-compare-actions";
import { createOpenAction } from "@/lib/enrichers/action-factory";
import type { LinkRow } from "@/types/database";

const hour = 60 * 60 * 1000;
const day = 24 * hour;
const now = Date.now();

const u = (id: string) =>
  `https://images.unsplash.com/${id}?w=960&auto=format&fit=crop&q=80`;

const IMG = {
  iphone: u("photo-1695048133142-1a20484d2569"),
  macbook: u("photo-1517336714731-489689fd1ca8"),
  galaxy: u("photo-1610945415295-d9bbf067e59c"),
  jeju: u("photo-1570168007204-dfb528c30a6b"),
  tokyo: u("photo-1540959733332-eab4deab809a"),
  ramen: u("photo-1569718212165-3a8278d5f624"),
  study: u("photo-1456513080510-7bf93a163b78"),
  history: u("photo-1481627834876-b7833e8f5570"),
  youtube: u("photo-1611162617474-5b21e939e113"),
  news: u("photo-1504711434969-e33886168f5c"),
  concert: u("photo-1459747222520-2f9b0d4a0b8c"),
  receipt: u("photo-1554224311-beee415c18f7"),
  cafe: u("photo-1495474472287-4d45bcff1ccd"),
  airpods: u("photo-1606220945770-b5462651f451"),
} as const;

export const SAMPLE_STUDY_OCR_QUANTUM = `양자역학의 측정 문제
Page 47

The measurement problem in quantum mechanics asks how definite outcomes emerge from superposition states. Before measurement, the system exists in a linear combination of eigenstates.

Copenhagen interpretation: measurement causes wavefunction collapse.
Many-worlds: all outcomes occur in branching universes.

핵심 용어: 중첩(superposition), 관측(measurement), 파동함수(wavefunction)
시험 포인트: 측정 장치의 역할과 환경과의 상호작용을 설명할 것.`;

export const SAMPLE_STUDY_OCR_HISTORY = `한국사 · 조선 후기 사회 변동
Page 112

Commercialization of grain markets and the rise of merchant capital reshaped village economies in the late Joseon period. Yangban status became less tied to land alone.

핵심 개념: 상평통보, 호남 상인, 농본주의 vs 상업 자본
시험 포인트: 18세기 조·후 교역 확대가 사회 구조에 준 영향을 서술하시오.`;

export const SAMPLE_FOOD_OCR = `떡반집 은행동점
떡볶이 + 모듬토스트 세트 8,900원
영업시간 11:00 - 22:00
대전 중구 은행동 123

인스타에서 본 그 맛집 — 줄 서서 먹는다고 함`;

export const SAMPLE_TICKET_OCR = `Melon Ticket
NewJeans World Tour 2026
2026.08.15 (토) 19:00
KSPO DOME · R석
예매번호 T20260815-0042`;

export const SAMPLE_PAYMENT_OCR = `국민은행 입금 확인
보내는 분: 홍길동
받는 분: 김철수
계좌 123-456-789012
금액 150,000원
적요: 5월 카페 정산`;

function baseSampleLink(input: {
  id: string;
  url: string;
  title: string;
  domain: string;
  category: string;
  thumbnail_url: string;
  source_type: LinkRow["source_type"];
  visual_mode?: LinkRow["visual_mode"];
  actions: LinkRow["actions"];
  ageHours: number;
}): LinkRow {
  return {
    id: input.id,
    user_id: null,
    original_url: input.url,
    title: input.title,
    thumbnail_url: input.thumbnail_url,
    domain: input.domain,
    category: input.category,
    actions: input.actions.map((action, index) => ({
      ...action,
      payload: {
        ...(action.payload ?? {}),
        rimvioSample: true,
        ...(index === 0 ? { sampleCard: input.id } : {}),
      },
    })),
    visual_mode: input.visual_mode ?? "thumb",
    source_type: input.source_type,
    share_slug: `sample-${input.id}`,
    link_status: "open",
    room_id: null,
    created_at: new Date(now - input.ageHours * hour).toISOString(),
    expires_at: new Date(now + 30 * day).toISOString(),
  };
}

function mapActions(query: string, href?: string) {
  return [
    createOpenAction({
      label: "🗺 지도에서 열기",
      href: href ?? `https://map.naver.com/v5/search/${encodeURIComponent(query)}`,
      icon: "map",
      copyText: query,
    }),
    createOpenAction({
      label: "🔗 Google 지도",
      href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`,
      icon: "external-link",
      copyText: query,
    }),
  ];
}

function commerceLink(input: {
  id: string;
  url: string;
  title: string;
  domain: string;
  thumbnail_url: string;
  ageHours: number;
}): LinkRow {
  const compareActions = buildMarketCompareActions(
    {
      sourceUrl: input.url,
      domain: input.domain,
      title: input.title,
      appLocale: "ko",
    },
    { maxActions: 3 }
  );

  return baseSampleLink({
    ...input,
    category: "shopping",
    source_type: "commerce",
    actions: compareActions.length
      ? compareActions
      : [
          createOpenAction({
            label: "🔗 원본 보기",
            href: input.url,
            icon: "external-link",
            copyText: input.title,
          }),
        ],
  });
}

function captureLink(input: {
  id: string;
  captureId: string;
  title: string;
  category: string;
  thumbnail_url: string;
  ocrText: string;
  ageHours: number;
  extraActions?: LinkRow["actions"];
}): LinkRow {
  return baseSampleLink({
    id: input.id,
    url: `https://rimvio.app/capture/${input.captureId}`,
    title: input.title,
    domain: "rimvio.app",
    category: input.category,
    thumbnail_url: input.thumbnail_url,
    source_type: "screenshot",
    ageHours: input.ageHours,
    actions: [
      ...(input.extraActions ?? []),
      createOpenAction({
        label: "📝 핵심만 정리",
        href: "https://chatgpt.com/",
        icon: "sparkles",
        copyText: input.ocrText,
      }),
    ],
  });
}

function studyLink(input: {
  id: string;
  captureId: string;
  title: string;
  thumbnail_url: string;
  ocrText: string;
  ageHours: number;
}): LinkRow {
  return captureLink({
    ...input,
    category: "research",
    extraActions: [
      createOpenAction({
        label: "📝 시험 포스트잇",
        href: "https://chatgpt.com/",
        icon: "sparkles",
        copyText: input.ocrText,
      }),
      createOpenAction({
        label: "🔊 핵심 용어 듣기",
        href: "https://translate.google.com/",
        icon: "link",
        copyText: input.ocrText,
      }),
    ],
  });
}

/** Curated onboarding deck — every major Rimvio surface in one swipe tour. */
export function buildSampleFeedLinks(): LinkRow[] {
  return [
    // 🛍 Commerce + true-cost / EST verdict
    commerceLink({
      id: "sample-commerce-iphone",
      url: "https://web.joongna.com/product/sample-iphone-15-pro",
      title: "[급처] 아이폰 15 Pro 256GB 850,000원",
      domain: "web.joongna.com",
      thumbnail_url: IMG.iphone,
      ageHours: 1.2,
    }),
    commerceLink({
      id: "sample-commerce-macbook",
      url: "https://m.bunjang.co.kr/products/sample-macbook-air-m3",
      title: "맥북 Air M3 13 · 512GB 980,000원",
      domain: "m.bunjang.co.kr",
      thumbnail_url: IMG.macbook,
      ageHours: 1.15,
    }),
    commerceLink({
      id: "sample-commerce-airpods",
      url: "https://www.coupang.com/vp/products/sample-airpods-pro2",
      title: "에어팟 프로 2세대 · 미개봉 219,000원",
      domain: "coupang.com",
      thumbnail_url: IMG.airpods,
      ageHours: 1.1,
    }),
    captureLink({
      id: "sample-commerce-galaxy-cap",
      captureId: "sample-galaxy-ultra",
      title: "갤럭시 S24 Ultra 256GB · 캡처 720,000원",
      category: "shopping",
      thumbnail_url: IMG.galaxy,
      ocrText: "Galaxy S24 Ultra 256GB\n티타늄 그레이\n720,000원\n직거래 가능",
      ageHours: 1.05,
      extraActions: buildMarketCompareActions(
        {
          sourceUrl: "https://rimvio.app/capture/sample-galaxy-ultra",
          domain: "rimvio.app",
          title: "갤럭시 S24 Ultra 256GB 720,000원",
          appLocale: "ko",
        },
        { maxActions: 2 }
      ),
    }),

    // 📚 Study post-it
    studyLink({
      id: "sample-study-quantum",
      captureId: "sample-study-quantum",
      title: "양자역학 · 측정 문제 (p.47)",
      thumbnail_url: IMG.study,
      ocrText: SAMPLE_STUDY_OCR_QUANTUM,
      ageHours: 1.0,
    }),
    studyLink({
      id: "sample-study-history",
      captureId: "sample-study-history",
      title: "한국사 · 조선 후기 (p.112)",
      thumbnail_url: IMG.history,
      ocrText: SAMPLE_STUDY_OCR_HISTORY,
      ageHours: 0.95,
    }),

    // ✈️ Travel + MapAppSheet
    baseSampleLink({
      id: "sample-travel-jeju",
      url: "https://map.naver.com/p/search/성산일출봉",
      title: "제주 성산일출봉 · 일몰 타임",
      domain: "map.naver.com",
      category: "travel",
      thumbnail_url: IMG.jeju,
      source_type: "map",
      ageHours: 0.9,
      actions: mapActions("제주 성산일출봉"),
    }),
    baseSampleLink({
      id: "sample-travel-tokyo",
      url: "https://map.naver.com/p/search/도쿄%20시부야",
      title: "도쿄 시부야 · 2박 스카이 라운지",
      domain: "map.naver.com",
      category: "travel",
      thumbnail_url: IMG.tokyo,
      source_type: "map",
      ageHours: 0.85,
      actions: mapActions("도쿄 시부야 스카이", "https://map.naver.com/p/search/도쿄%20시부야"),
    }),

    // 🍜 Food locate
    captureLink({
      id: "sample-food-ramen",
      captureId: "sample-food-ramen",
      title: "떡반집 은행동 · 떡볶이 토스트",
      category: "food",
      thumbnail_url: IMG.ramen,
      ocrText: SAMPLE_FOOD_OCR,
      ageHours: 0.8,
      extraActions: mapActions("떡반집 은행동"),
    }),
    baseSampleLink({
      id: "sample-food-cafe",
      url: "https://map.naver.com/p/search/성수%20카페%20브런치",
      title: "성수 브런치 카페 · 웨이팅 20분",
      domain: "map.naver.com",
      category: "food",
      thumbnail_url: IMG.cafe,
      source_type: "map",
      ageHours: 0.75,
      actions: [
        ...mapActions("성수 카페 브런치"),
        createOpenAction({
          label: "📅 캐치테이블",
          href: "https://app.catchtable.co.kr/ct/search/total?query=성수%20브런치",
          icon: "link",
          copyText: "성수 브런치",
        }),
      ],
    }),

    // ▶️ Media time receipt
    baseSampleLink({
      id: "sample-media-youtube",
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      title: "40분 다큐 · AI가 바꾸는 일의 미래",
      domain: "youtube.com",
      category: "media",
      thumbnail_url: IMG.youtube,
      source_type: "video",
      visual_mode: "poster",
      ageHours: 0.7,
      actions: [
        createOpenAction({
          label: "▶️ 영상 재생",
          href: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
          icon: "youtube",
          copyText: "AI가 바꾸는 일의 미래",
        }),
        createOpenAction({
          label: "🧠 3줄 요약",
          href: "https://chatgpt.com/",
          icon: "sparkles",
          copyText: "AI가 바꾸는 일의 미래 — 3줄 요약",
        }),
      ],
    }),

    // 📰 Article time receipt
    baseSampleLink({
      id: "sample-article-news",
      url: "https://www.yna.co.kr/view/AKR20260527076600530",
      title: "기후·에너지 전환 — 8분 읽기",
      domain: "yna.co.kr",
      category: "research",
      thumbnail_url: IMG.news,
      source_type: "article",
      ageHours: 0.65,
      actions: [
        createOpenAction({
          label: "📖 기사 열기",
          href: "https://www.yna.co.kr/view/AKR20260527076600530",
          icon: "external-link",
          copyText: "기후·에너지 전환",
        }),
        createOpenAction({
          label: "🧠 3줄 요약",
          href: "https://chatgpt.com/",
          icon: "sparkles",
          copyText: "기후·에너지 전환 기사 3줄 요약",
        }),
      ],
    }),

    // 🎫 Ticket / utility captures
    captureLink({
      id: "sample-ticket-concert",
      captureId: "sample-ticket-concert",
      title: "NewJeans 월드투어 · 8/15 KSPO",
      category: "social",
      thumbnail_url: IMG.concert,
      ocrText: SAMPLE_TICKET_OCR,
      ageHours: 0.6,
      extraActions: [
        createOpenAction({
          label: "📅 캘린더에 추가",
          href: "https://calendar.google.com/",
          icon: "link",
          copyText: SAMPLE_TICKET_OCR,
        }),
        ...mapActions("KSPO DOME"),
      ],
    }),
    captureLink({
      id: "sample-payment-split",
      captureId: "sample-payment-split",
      title: "5월 카페 정산 · 150,000원",
      category: "finance",
      thumbnail_url: IMG.receipt,
      ocrText: SAMPLE_PAYMENT_OCR,
      ageHours: 0.55,
      extraActions: [
        createOpenAction({
          label: "💸 송금 앱 열기",
          href: "https://toss.me/",
          icon: "link",
          copyText: SAMPLE_PAYMENT_OCR,
        }),
        createOpenAction({
          label: "📋 계좌 복사",
          href: "https://www.kakaobank.com/",
          icon: "copy",
          copyText: "123-456-789012",
        }),
      ],
    }),
  ];
}

export const SAMPLE_FEED_LINK_IDS = buildSampleFeedLinks().map((link) => link.id);
