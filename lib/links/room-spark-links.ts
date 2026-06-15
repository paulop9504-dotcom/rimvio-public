import { normalizeLinkCategory, type LinkCategory } from "@/lib/categories/types";
import {
  localizeTravelSpark,
  type CountryCode,
} from "@/lib/links/spark-locale";
import type { LinkRow } from "@/types/database";

export type RoomSparkLink = {
  id: string;
  title: string;
  subtitle: string;
  url: string;
};

const SPARK_CATALOG: Record<LinkCategory, RoomSparkLink[]> = {
  media: [
    {
      id: "spark-imdb",
      title: "IMDb Top 250",
      subtitle: "다음에 볼 거 상상하기",
      url: "https://www.imdb.com/chart/top/",
    },
    {
      id: "spark-letterboxd",
      title: "Letterboxd",
      subtitle: "취향 비슷한 영화 찾기",
      url: "https://letterboxd.com/",
    },
  ],
  shopping: [
    {
      id: "spark-pinterest",
      title: "Pinterest 보드",
      subtitle: "비슷한 무드 더 찾기",
      url: "https://www.pinterest.com/search/pins/?q=shopping",
    },
    {
      id: "spark-29cm",
      title: "29CM 큐레이션",
      subtitle: "감각 비슷한 브랜드",
      url: "https://www.29cm.co.kr/",
    },
  ],
  travel: [
    {
      id: "spark-google-earth",
      title: "Google Earth",
      subtitle: "다음 여행지 상상하기",
      url: "https://earth.google.com/web/",
    },
    {
      id: "spark-atlas",
      title: "Atlas Obscura",
      subtitle: "숨은 명소 떠올리기",
      url: "https://www.atlasobscura.com/",
    },
  ],
  research: [
    {
      id: "spark-wiki-random",
      title: "위키 랜덤 문서",
      subtitle: "딴길로 상상력 확장",
      url: "https://ko.wikipedia.org/wiki/Special:Random",
    },
    {
      id: "spark-ted",
      title: "TED Talks",
      subtitle: "비슷한 주제 더 깊게",
      url: "https://www.ted.com/talks",
    },
    {
      id: "spark-scholar",
      title: "Google Scholar",
      subtitle: "근거 더 찾아보기",
      url: "https://scholar.google.com/",
    },
  ],
  social: [
    {
      id: "spark-goodreads",
      title: "Goodreads",
      subtitle: "비슷한 취향 더 찾기",
      url: "https://www.goodreads.com/",
    },
    {
      id: "spark-kakao",
      title: "카카오톡 오픈채팅",
      subtitle: "같이 얘기해볼 주제",
      url: "https://open.kakao.com/",
    },
  ],
  uncategorized: [
    {
      id: "spark-producthunt",
      title: "Product Hunt",
      subtitle: "새로운 아이디어 떠올리기",
      url: "https://www.producthunt.com/",
    },
    {
      id: "spark-are-na",
      title: "Are.na",
      subtitle: "영감 보드 만들기",
      url: "https://www.are.na/",
    },
  ],
};

const DOMAIN_SPARKS: Record<string, RoomSparkLink[]> = {
  "google.com": SPARK_CATALOG.research,
  "youtube.com": SPARK_CATALOG.media,
  "naver.com": SPARK_CATALOG.travel,
  "coupang.com": SPARK_CATALOG.shopping,
};

function roomUrls(links: LinkRow[]) {
  return new Set(links.map((link) => link.original_url));
}

export type FindRoomSparkLinksOptions = {
  /** User origin country (defaults from link context, usually KR). */
  homeCountry?: CountryCode;
};

/** Imagination-boosting links related to current card (not already in room). */
export function findRoomSparkLinks(
  current: LinkRow,
  roomLinks: LinkRow[],
  limit = 3,
  options?: FindRoomSparkLinksOptions
): RoomSparkLink[] {
  const taken = roomUrls(roomLinks);
  const category = normalizeLinkCategory(current.category);
  const domainKey = Object.keys(DOMAIN_SPARKS).find((key) =>
    current.domain.includes(key)
  );

  const pool = [
    ...(DOMAIN_SPARKS[domainKey ?? ""] ?? []),
    ...SPARK_CATALOG[category],
    ...SPARK_CATALOG.uncategorized,
  ];

  const seen = new Set<string>();
  const localizedPool =
    category === "travel"
      ? pool.map((item) => localizeTravelSpark(item, current, options))
      : pool;

  return localizedPool
    .filter((item) => {
      if (taken.has(item.url) || seen.has(item.id)) {
        return false;
      }

      seen.add(item.id);
      return true;
    })
    .slice(0, limit);
}
