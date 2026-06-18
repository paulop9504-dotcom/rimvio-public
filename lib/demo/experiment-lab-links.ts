import { buildMarketCompareActions } from "@/lib/markets/build-compare-actions";
import { createOpenAction } from "@/lib/enrichers/action-factory";
import type { CompareDestinationId } from "@/lib/markets/types";
import type { LinkRow } from "@/types/database";

/** Naver Shopping web search blocks rapid lab taps — use danawa/bunjang instead. */
const LAB_COMPARE_EXCLUDE: CompareDestinationId[] = ["naver_shopping"];

function labCompareActions(
  ctx: Parameters<typeof buildMarketCompareActions>[0],
  options?: { maxActions?: number }
) {
  return buildMarketCompareActions(ctx, {
    ...options,
    excludeDestinationIds: LAB_COMPARE_EXCLUDE,
  });
}

const hour = 60 * 60 * 1000;
const day = 24 * hour;
const now = Date.now();

const u = (id: string) =>
  `https://images.unsplash.com/${id}?w=960&auto=format&fit=crop&q=80`;

/** Diverse lab photos — travel-first, then food / nature / lifestyle / tech. */
const IMG = {
  // ✈️ Travel — cities & landmarks
  paris: u("photo-1502602898657-d9831774eeeb"),
  tokyo: u("photo-1540959733332-eab4deab809a"),
  bali: u("photo-1537996193271-af1138a2e151"),
  santorini: u("photo-1613395877344-13fee52dba11"),
  alps: u("photo-1530121734774-db207363253e"),
  nyc: u("photo-1496442226666-8d4d0e62e6e9"),
  kyoto: u("photo-1493976040374-85c8e6a4793f"),
  bangkok: u("photo-1508009603885-50cf7fe6708e"),
  iceland: u("photo-1504829857799-ddff355209f0"),
  maldives: u("photo-1514282401047-d3cae28d34a0"),
  london: u("photo-1513635269975-59663e0ac1ad"),
  rome: u("photo-1552832230-c01951dd5940"),
  barcelona: u("photo-1583422409516-2895ab7bb434"),
  dubai: u("photo-1512453979798-5ea266f88809"),
  hawaii: u("photo-1507876461078-4e42b2af24ba"),
  norway: u("photo-1467269200454-4a0966a10f3f"),
  greatWall: u("photo-1508804185872-d97bad689e37"),
  sydney: u("photo-1506973035877-a5ec40212442"),
  amalfi: u("photo-1534447677748-cc7a38867453"),
  safari: u("photo-1516426122078-c23e6c681bfd"),
  // 🇰🇷 Korea
  seoul: u("photo-1517154421773-0529f29ea451"),
  busan: u("photo-1596422846542-9f1642414751"),
  jeju: u("photo-1570168007204-dfb528c30a6b"),
  gyeongbok: u("photo-1583417318130-1731babb0a5c"),
  // 🍜 Food
  ramen: u("photo-1569718212165-3a8278d5f624"),
  sushi: u("photo-1579875377823-98574363c0f8"),
  pizza: u("photo-1513104890138-7c749659a591"),
  croissant: u("photo-1555507036-ab1f4038808a"),
  kbbq: u("photo-1590301157890-4810ed352737"),
  boba: u("photo-1525385133512-ff32e9391080"),
  cafe: u("photo-1495474472287-4d45bcff1ccd"),
  brunch: u("photo-1501339846609-4e4b4d4e4b4a"),
  // 🌿 Nature
  aurora: u("photo-1483342727414-daf2cab1340f"),
  desert: u("photo-1509316785280-0252405160d0"),
  forest: u("photo-1441974231531-c6227db76b6e"),
  beach: u("photo-1507525428034-b723cf961d3e"),
  // 🛍 Tech & shopping (True Cost lab)
  iphone: u("photo-1695048133142-1a20484d2569"),
  macbook: u("photo-1517336714731-489689fd1ca8"),
  galaxy: u("photo-1610945415295-d9bbf067e59c"),
  airpods: u("photo-1606220945770-b5462651f451"),
  nike: u("photo-1542291026-7eec264c27ff"),
  headphone: u("photo-1618366712010-f4ae872c0f18"),
  fashion: u("photo-1445205170230-053b83016050"),
  skincare: u("photo-1556228720-195a672e8a03"),
  // 📺 Media
  youtube: u("photo-1611162617474-5b21e939e113"),
  concert: u("photo-1459747222520-2f9b0d4a0b8c"),
  museum: u("photo-1564399579883-451a5d0ec870"),
} as const;

function baseLink(input: {
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
    actions: input.actions,
    visual_mode: input.visual_mode ?? "thumb",
    source_type: input.source_type,
    share_slug: `lab-${input.id}`,
    link_status: "open",
    room_id: null,
    created_at: new Date(now - input.ageHours * hour).toISOString(),
    expires_at: new Date(now + 7 * day).toISOString(),
  };
}

function mapActions(query: string, href?: string) {
  return [
    createOpenAction({
      label: "🗺 지도 검색",
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

function travelUrl(input: {
  id: string;
  title: string;
  query: string;
  url: string;
  domain: string;
  thumbnail_url: string;
  ageHours: number;
}) {
  return baseLink({
    ...input,
    category: "travel",
    source_type: "map",
    actions: mapActions(input.query, input.url),
  });
}

function travelShot(input: {
  id: string;
  captureId: string;
  title: string;
  query: string;
  thumbnail_url: string;
  ageHours: number;
}) {
  return baseLink({
    id: input.id,
    url: `https://rimvio.app/capture/${input.captureId}`,
    title: input.title,
    domain: "rimvio.app",
    category: "travel",
    thumbnail_url: input.thumbnail_url,
    source_type: "screenshot",
    actions: [
      ...mapActions(input.query),
      createOpenAction({
        label: "📅 캐치테이블",
        href: `https://app.catchtable.co.kr/ct/search/total?query=${encodeURIComponent(input.query)}`,
        icon: "link",
        copyText: input.query,
      }),
    ],
    ageHours: input.ageHours,
  });
}

function foodShot(input: {
  id: string;
  captureId: string;
  title: string;
  query: string;
  thumbnail_url: string;
  ageHours: number;
}) {
  return travelShot({ ...input, query: input.query });
}

function commerceLink(input: {
  id: string;
  url: string;
  title: string;
  domain: string;
  thumbnail_url: string;
  ageHours: number;
}) {
  const actions = labCompareActions(
    { sourceUrl: input.url, domain: input.domain, title: input.title, appLocale: "ko" },
    { maxActions: 3 }
  );

  return baseLink({
    ...input,
    category: "shopping",
    source_type: "commerce",
    actions: actions.length
      ? actions
      : [
          createOpenAction({
            label: "🔗 원본 열기",
            href: input.url,
            icon: "external-link",
            copyText: input.title,
          }),
        ],
  });
}

function productShot(input: {
  id: string;
  captureId: string;
  title: string;
  thumbnail_url: string;
  ageHours: number;
}) {
  return baseLink({
    id: input.id,
    url: `https://rimvio.app/capture/${input.captureId}`,
    title: input.title,
    domain: "rimvio.app",
    category: "shopping",
    thumbnail_url: input.thumbnail_url,
    source_type: "screenshot",
    actions: labCompareActions(
      {
        sourceUrl: `https://rimvio.app/capture/${input.captureId}`,
        domain: "rimvio.app",
        title: input.title,
        appLocale: "ko",
      },
      { maxActions: 3 }
    ),
    ageHours: input.ageHours,
  });
}

/** Travel-first diverse lab feed for screenshot / telemetry experiments. */
export const experimentLabLinks: LinkRow[] = [
  // —— ✈️ 해외 여행 ——
  travelUrl({
    id: "lab-travel-paris",
    title: "파리 에펠탑 3박 일정",
    query: "Tour Eiffel Paris",
    url: "https://www.google.com/maps/place/Eiffel+Tower",
    domain: "google.com",
    thumbnail_url: IMG.paris,
    ageHours: 0.05,
  }),
  travelShot({
    id: "lab-shot-tokyo",
    captureId: "lab-tokyo-shibuya",
    title: "도쿄 시부야 스크린샷",
    query: "Shibuya Tokyo",
    thumbnail_url: IMG.tokyo,
    ageHours: 0.1,
  }),
  travelUrl({
    id: "lab-travel-bali",
    title: "발리 우붓 풀빌라",
    query: "Ubud Bali resort",
    url: "https://www.airbnb.com/s/Ubud--Indonesia/homes",
    domain: "airbnb.com",
    thumbnail_url: IMG.bali,
    ageHours: 0.15,
  }),
  travelShot({
    id: "lab-shot-santorini",
    captureId: "lab-santorini",
    title: "산토리니 오ía 일몰",
    query: "Oia Santorini",
    thumbnail_url: IMG.santorini,
    ageHours: 0.2,
  }),
  travelUrl({
    id: "lab-travel-alps",
    title: "스위스 알프스 스키",
    query: "Zermatt Switzerland",
    url: "https://www.google.com/maps/search/Zermatt",
    domain: "google.com",
    thumbnail_url: IMG.alps,
    ageHours: 0.25,
  }),
  travelShot({
    id: "lab-shot-nyc",
    captureId: "lab-nyc-times",
    title: "뉴욕 타임스퀘어",
    query: "Times Square New York",
    thumbnail_url: IMG.nyc,
    ageHours: 0.3,
  }),
  travelUrl({
    id: "lab-travel-kyoto",
    title: "교토 기요미즈dera",
    query: "Kiyomizu-dera Kyoto",
    url: "https://www.google.com/maps/search/Kiyomizu-dera",
    domain: "google.com",
    thumbnail_url: IMG.kyoto,
    ageHours: 0.35,
  }),
  travelShot({
    id: "lab-shot-bangkok",
    captureId: "lab-bangkok",
    title: "방콕 왓 아룬",
    query: "Wat Arun Bangkok",
    thumbnail_url: IMG.bangkok,
    ageHours: 0.4,
  }),
  travelUrl({
    id: "lab-travel-iceland",
    title: "아이슬란드 블루라군",
    query: "Blue Lagoon Iceland",
    url: "https://www.google.com/maps/search/Blue+Lagoon+Iceland",
    domain: "google.com",
    thumbnail_url: IMG.iceland,
    ageHours: 0.45,
  }),
  travelShot({
    id: "lab-shot-maldives",
    captureId: "lab-maldives",
    title: "몰디브 수상bungalow",
    query: "Maldives overwater villa",
    thumbnail_url: IMG.maldives,
    ageHours: 0.5,
  }),
  travelUrl({
    id: "lab-travel-london",
    title: "런던 빅벤 & 템즈",
    query: "Big Ben London",
    url: "https://www.google.com/maps/search/Big+Ben",
    domain: "google.com",
    thumbnail_url: IMG.london,
    ageHours: 0.55,
  }),
  travelShot({
    id: "lab-shot-rome",
    captureId: "lab-rome-colosseum",
    title: "로마 콜로세움",
    query: "Colosseum Rome",
    thumbnail_url: IMG.rome,
    ageHours: 0.6,
  }),
  travelUrl({
    id: "lab-travel-barcelona",
    title: "바르셀로나 사그라다",
    query: "Sagrada Familia Barcelona",
    url: "https://www.google.com/maps/search/Sagrada+Familia",
    domain: "google.com",
    thumbnail_url: IMG.barcelona,
    ageHours: 0.65,
  }),
  travelShot({
    id: "lab-shot-dubai",
    captureId: "lab-dubai-burj",
    title: "두바이 부르j Khalifa",
    query: "Burj Khalifa Dubai",
    thumbnail_url: IMG.dubai,
    ageHours: 0.7,
  }),
  travelUrl({
    id: "lab-travel-hawaii",
    title: "하와이 와이키키 해변",
    query: "Waikiki Beach Hawaii",
    url: "https://www.google.com/maps/search/Waikiki+Beach",
    domain: "google.com",
    thumbnail_url: IMG.hawaii,
    ageHours: 0.75,
  }),
  travelShot({
    id: "lab-shot-norway",
    captureId: "lab-norway-fjord",
    title: "노르웨이 피오르",
    query: "Geirangerfjord Norway",
    thumbnail_url: IMG.norway,
    ageHours: 0.8,
  }),
  travelUrl({
    id: "lab-travel-greatwall",
    title: "만리장성 뮤타이뉴",
    query: "Mutianyu Great Wall",
    url: "https://www.google.com/maps/search/Mutianyu",
    domain: "google.com",
    thumbnail_url: IMG.greatWall,
    ageHours: 0.85,
  }),
  travelShot({
    id: "lab-shot-sydney",
    captureId: "lab-sydney-opera",
    title: "시드니 오페라하우스",
    query: "Sydney Opera House",
    thumbnail_url: IMG.sydney,
    ageHours: 0.9,
  }),
  travelUrl({
    id: "lab-travel-amalfi",
    title: "이탈리아 아말피 Coast",
    query: "Amalfi Coast Italy",
    url: "https://www.google.com/maps/search/Amalfi+Coast",
    domain: "google.com",
    thumbnail_url: IMG.amalfi,
    ageHours: 0.95,
  }),
  travelShot({
    id: "lab-shot-safari",
    captureId: "lab-kenya-safari",
    title: "케냐 사파리 투어",
    query: "Maasai Mara safari",
    thumbnail_url: IMG.safari,
    ageHours: 1,
  }),

  // —— 🇰🇷 국내 ——
  travelShot({
    id: "lab-shot-seoul-palace",
    captureId: "lab-gyeongbok",
    title: "경복궁 야간개장",
    query: "경복궁",
    thumbnail_url: IMG.gyeongbok,
    ageHours: 1.05,
  }),
  travelUrl({
    id: "lab-travel-seoul",
    title: "서울 N서울타워 야경",
    query: "N서울타워",
    url: "https://map.kakao.com/?q=N서울타워",
    domain: "kakao.com",
    thumbnail_url: IMG.seoul,
    ageHours: 1.1,
  }),
  travelShot({
    id: "lab-shot-busan",
    captureId: "lab-busan-gwangan",
    title: "부산 광안리 야경",
    query: "부산 광안리",
    thumbnail_url: IMG.busan,
    ageHours: 1.15,
  }),
  travelUrl({
    id: "lab-travel-jeju",
    title: "제주 성산일출봉",
    query: "성산일출봉",
    url: "https://map.kakao.com/?q=성산일출봉",
    domain: "kakao.com",
    thumbnail_url: IMG.jeju,
    ageHours: 1.2,
  }),

  // —— 🍜 맛집 / 카페 ——
  foodShot({
    id: "lab-food-ramen",
    captureId: "lab-ramen",
    title: "홍대 라멘 맛집",
    query: "홍대 라멘",
    thumbnail_url: IMG.ramen,
    ageHours: 1.25,
  }),
  foodShot({
    id: "lab-food-sushi",
    captureId: "lab-sushi",
    title: "오마카세 스시 코스",
    query: "강남 오마카세",
    thumbnail_url: IMG.sushi,
    ageHours: 1.3,
  }),
  foodShot({
    id: "lab-food-kbbq",
    captureId: "lab-kbbq",
    title: "성수 한우 BBQ",
    query: "성수 한우",
    thumbnail_url: IMG.kbbq,
    ageHours: 1.35,
  }),
  foodShot({
    id: "lab-food-cafe",
    captureId: "lab-cafe-onion",
    title: "성수동 카페 Onion",
    query: "성수동 Onion",
    thumbnail_url: IMG.cafe,
    ageHours: 1.4,
  }),
  foodShot({
    id: "lab-food-brunch",
    captureId: "lab-brunch",
    title: "한남 브런치 카페",
    query: "한남 브런치",
    thumbnail_url: IMG.brunch,
    ageHours: 1.45,
  }),
  foodShot({
    id: "lab-food-boba",
    captureId: "lab-boba",
    title: "버블티 신메뉴",
    query: "성수 버블티",
    thumbnail_url: IMG.boba,
    ageHours: 1.5,
  }),

  // —— 🌿 자연 ——
  travelShot({
    id: "lab-nature-aurora",
    captureId: "lab-aurora",
    title: "핀란드 오로라",
    query: "Rovaniemi aurora",
    thumbnail_url: IMG.aurora,
    ageHours: 1.55,
  }),
  travelShot({
    id: "lab-nature-desert",
    captureId: "lab-desert",
    title: "사하라 사막 투어",
    query: "Sahara desert tour",
    thumbnail_url: IMG.desert,
    ageHours: 1.6,
  }),
  travelShot({
    id: "lab-nature-forest",
    captureId: "lab-forest",
    title: "캐나다 단풍 숲",
    query: "Banff National Park",
    thumbnail_url: IMG.forest,
    ageHours: 1.65,
  }),
  travelShot({
    id: "lab-nature-beach",
    captureId: "lab-beach",
    title: "필리핀 열대 해변",
    query: "Palawan Philippines",
    thumbnail_url: IMG.beach,
    ageHours: 1.7,
  }),

  // —— 🎭 라이프 / 미디어 ——
  baseLink({
    id: "lab-media-concert",
    url: "https://ticket.interpark.com/",
    title: "콘서트 티켓 예매",
    domain: "interpark.com",
    category: "media",
    thumbnail_url: IMG.concert,
    source_type: "generic",
    actions: [
      createOpenAction({
        label: "🎫 티켓 열기",
        href: "https://ticket.interpark.com/",
        icon: "link",
      }),
    ],
    ageHours: 1.75,
  }),
  baseLink({
    id: "lab-media-museum",
    url: "https://www.museum.go.kr/",
    title: "국립중앙박물관 전시",
    domain: "museum.go.kr",
    category: "media",
    thumbnail_url: IMG.museum,
    source_type: "generic",
    actions: [
      createOpenAction({
        label: "🏛 전시 정보",
        href: "https://www.museum.go.kr/",
        icon: "link",
      }),
    ],
    ageHours: 1.8,
  }),
  baseLink({
    id: "lab-youtube",
    url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    title: "YouTube — 여행 브이로그",
    domain: "youtube.com",
    category: "media",
    thumbnail_url: IMG.youtube,
    source_type: "video",
    actions: [
      createOpenAction({
        label: "▶️ 재생",
        href: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        icon: "youtube",
      }),
    ],
    ageHours: 1.85,
  }),

  // —— 🛍 쇼핑 / Tech (True Cost 실험) ——
  commerceLink({
    id: "lab-iphone-joongna",
    url: "https://web.joongna.com/product/12345678",
    title: "아이폰 15 Pro 256GB",
    domain: "web.joongna.com",
    thumbnail_url: IMG.iphone,
    ageHours: 1.9,
  }),
  productShot({
    id: "lab-shot-iphone",
    captureId: "lab-iphone-cap",
    title: "아이폰 중고 캡처",
    thumbnail_url: IMG.iphone,
    ageHours: 1.95,
  }),
  commerceLink({
    id: "lab-macbook-bunjang",
    url: "https://m.bunjang.co.kr/products/987654321",
    title: "맥북 Air M3 13인치",
    domain: "m.bunjang.co.kr",
    thumbnail_url: IMG.macbook,
    ageHours: 2,
  }),
  productShot({
    id: "lab-shot-galaxy",
    captureId: "lab-galaxy-cap",
    title: "갤럭시 S24 Ultra 캡처",
    thumbnail_url: IMG.galaxy,
    ageHours: 2.05,
  }),
  productShot({
    id: "lab-shot-airpods",
    captureId: "lab-airpods-cap",
    title: "에어팟 프로 2세대",
    thumbnail_url: IMG.airpods,
    ageHours: 2.1,
  }),
  productShot({
    id: "lab-shot-nike",
    captureId: "lab-nike-dunk",
    title: "나이키 덩크 로우",
    thumbnail_url: IMG.nike,
    ageHours: 2.15,
  }),
  commerceLink({
    id: "lab-headphone-coupang",
    url: "https://www.coupang.com/vp/products/7654321",
    title: "Sony WH-1000XM5",
    domain: "coupang.com",
    thumbnail_url: IMG.headphone,
    ageHours: 2.2,
  }),
  productShot({
    id: "lab-shot-fashion",
    captureId: "lab-fashion-cap",
    title: "무신사 겨울 코트",
    thumbnail_url: IMG.fashion,
    ageHours: 2.25,
  }),
  productShot({
    id: "lab-shot-skincare",
    captureId: "lab-skincare-cap",
    title: "올영 세일 스킨케어",
    thumbnail_url: IMG.skincare,
    ageHours: 2.3,
  }),
];
