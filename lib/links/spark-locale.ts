import type { LinkRow } from "@/types/database";

export type CountryCode =
  | "KR"
  | "US"
  | "PH"
  | "JP"
  | "TH"
  | "VN"
  | "TW"
  | "SG"
  | "ID"
  | "AU"
  | "GB"
  | "FR"
  | "IT"
  | "ES"
  | "DE"
  | "CN";

export type LocalizedSparkLink = {
  id: string;
  title: string;
  subtitle: string;
  url: string;
};

type CountryProfile = {
  labelKo: string;
  earthQuery: string;
  hiddenGem: {
    title: string;
    url: string;
  };
};

const COUNTRY_PROFILES: Record<CountryCode, CountryProfile> = {
  KR: {
    labelKo: "한국",
    earthQuery: "South Korea travel",
    hiddenGem: {
      title: "네이버 여행",
      url: "https://search.naver.com/search.naver?where=blog&query=국내+숨은+명소",
    },
  },
  US: {
    labelKo: "미국",
    earthQuery: "United States travel",
    hiddenGem: {
      title: "Roadtrippers",
      url: "https://roadtrippers.com/",
    },
  },
  PH: {
    labelKo: "필리핀",
    earthQuery: "Philippines travel",
    hiddenGem: {
      title: "Guide to the Philippines",
      url: "https://guidetothephilippines.ph/things-to-do/",
    },
  },
  JP: {
    labelKo: "일본",
    earthQuery: "Japan travel",
    hiddenGem: {
      title: "MATCHA",
      url: "https://matcha-jp.com/en/",
    },
  },
  TH: {
    labelKo: "태국",
    earthQuery: "Thailand travel",
    hiddenGem: {
      title: "Tourism Thailand",
      url: "https://www.tourismthailand.org/",
    },
  },
  VN: {
    labelKo: "베트남",
    earthQuery: "Vietnam travel",
    hiddenGem: {
      title: "Vietnam Tourism",
      url: "https://vietnam.travel/things-to-do",
    },
  },
  TW: {
    labelKo: "대만",
    earthQuery: "Taiwan travel",
    hiddenGem: {
      title: "Taiwan Tourism",
      url: "https://www.taiwan.net.tw/",
    },
  },
  SG: {
    labelKo: "싱가포르",
    earthQuery: "Singapore travel",
    hiddenGem: {
      title: "Visit Singapore",
      url: "https://www.visitsingapore.com/",
    },
  },
  ID: {
    labelKo: "인도네시아",
    earthQuery: "Indonesia travel",
    hiddenGem: {
      title: "Wonderful Indonesia",
      url: "https://www.indonesia.travel/",
    },
  },
  AU: {
    labelKo: "호주",
    earthQuery: "Australia travel",
    hiddenGem: {
      title: "Australia.com",
      url: "https://www.australia.com/en-us/places.html",
    },
  },
  GB: {
    labelKo: "영국",
    earthQuery: "United Kingdom travel",
    hiddenGem: {
      title: "Visit Britain",
      url: "https://www.visitbritain.com/",
    },
  },
  FR: {
    labelKo: "프랑스",
    earthQuery: "France travel",
    hiddenGem: {
      title: "France.fr",
      url: "https://www.france.fr/en/",
    },
  },
  IT: {
    labelKo: "이탈리아",
    earthQuery: "Italy travel",
    hiddenGem: {
      title: "Italia.it",
      url: "https://www.italia.it/en",
    },
  },
  ES: {
    labelKo: "스페인",
    earthQuery: "Spain travel",
    hiddenGem: {
      title: "Spain.info",
      url: "https://www.spain.info/en/",
    },
  },
  DE: {
    labelKo: "독일",
    earthQuery: "Germany travel",
    hiddenGem: {
      title: "Germany Travel",
      url: "https://www.germany.travel/en/home.html",
    },
  },
  CN: {
    labelKo: "중국",
    earthQuery: "China travel",
    hiddenGem: {
      title: "China Travel",
      url: "https://www.travelchina.org.cn/",
    },
  },
};

export type HomeCountryOption = {
  code: CountryCode;
  labelKo: string;
};

/** Popular first — shown in first-run country picker. */
const HOME_COUNTRY_ORDER: CountryCode[] = [
  "KR",
  "US",
  "JP",
  "PH",
  "TH",
  "VN",
  "TW",
  "SG",
  "AU",
  "GB",
  "FR",
  "ID",
  "CN",
  "DE",
  "IT",
  "ES",
];

export function getCountryLabelKo(code: CountryCode): string {
  return COUNTRY_PROFILES[code].labelKo;
}

export function listHomeCountryOptions(): HomeCountryOption[] {
  return HOME_COUNTRY_ORDER.map((code) => ({
    code,
    labelKo: COUNTRY_PROFILES[code].labelKo,
  }));
}

export function isCountryCode(value: string): value is CountryCode {
  return Object.hasOwn(COUNTRY_PROFILES, value);
}

type CountryPattern = {
  code: CountryCode;
  pattern: RegExp;
};

const DESTINATION_PATTERNS: CountryPattern[] = [
  { code: "PH", pattern: /philippines|filipino|manila|cebu|palawan|boracay|필리핀|마닐라|세부|보라카이|팔라완/i },
  { code: "US", pattern: /united states|u\.s\.a|america|california|new york|hawaii|los angeles|san francisco|미국|하와이|뉴욕|캘리포니아|라스베이거스/i },
  { code: "JP", pattern: /japan|tokyo|kyoto|osaka|okinawa|일본|도쿄|교토|오사카|오키나와|후쿠오카/i },
  { code: "TH", pattern: /thailand|bangkok|phuket|chiang mai|태국|방콕|푸켓|치앙마이/i },
  { code: "VN", pattern: /vietnam|hanoi|ho chi minh|danang|베트남|하노이|호치민|다낭/i },
  { code: "TW", pattern: /taiwan|taipei|kaohsiung|대만|타이페이|타이중/i },
  { code: "SG", pattern: /singapore|싱가포르/i },
  { code: "ID", pattern: /indonesia|bali|jakarta|lombok|발리|인도네시아|자카르타/i },
  { code: "AU", pattern: /australia|sydney|melbourne|brisbane|호주|시드니|멜버른/i },
  { code: "GB", pattern: /united kingdom|britain|england|london|scotland|영국|런던|스코틀랜드/i },
  { code: "FR", pattern: /france|paris|nice|lyon|프랑스|파리|니스/i },
  { code: "IT", pattern: /italy|rome|venice|florence|milan|이탈리아|로마|베니스|피렌체/i },
  { code: "ES", pattern: /spain|barcelona|madrid|seville|스페인|바르셀로나|마드리드/i },
  { code: "DE", pattern: /germany|berlin|munich|frankfurt|독일|베를린|뮌헨/i },
  { code: "CN", pattern: /china|beijing|shanghai|hong kong|중국|베이징|상하이|홍콩/i },
  {
    code: "KR",
    pattern:
      /korea(?!n barbecue)|south korea|seoul|busan|jeju|gyeongju|gangneung|한국|국내|제주|서울|부산|경주|강릉|여수|전주|속초|visitkorea|kto\.or\.kr/i,
  },
];

const DOMESTIC_KR_DOMAINS = [
  "naver.com",
  "kakao.com",
  "yanolja.com",
  "goodchoice.kr",
  "visitkorea.or.kr",
  "kto.or.kr",
  "tripadvisor.co.kr",
];

function linkHaystack(link: LinkRow) {
  return `${link.title} ${link.original_url} ${link.domain}`.toLowerCase();
}

export function detectHomeCountry(
  link: LinkRow,
  override?: CountryCode
): CountryCode {
  if (override) {
    return override;
  }

  const haystack = linkHaystack(link);

  if (
    link.domain.endsWith(".kr") ||
    DOMESTIC_KR_DOMAINS.some((domain) => link.domain.includes(domain)) ||
    /[가-힣]/.test(link.title)
  ) {
    return "KR";
  }

  for (const { code, pattern } of DESTINATION_PATTERNS) {
    if (code !== "KR" && pattern.test(haystack)) {
      return code;
    }
  }

  return "KR";
}

export function detectDestinationCountry(link: LinkRow): CountryCode | null {
  const haystack = linkHaystack(link);

  for (const { code, pattern } of DESTINATION_PATTERNS) {
    if (pattern.test(haystack)) {
      return code;
    }
  }

  return null;
}

export function resolveTravelFocusCountry(
  link: LinkRow,
  homeCountry?: CountryCode
): CountryCode {
  const home = detectHomeCountry(link, homeCountry);
  const destination = detectDestinationCountry(link);

  if (destination) {
    return destination;
  }

  if (link.domain.endsWith(".kr") || DOMESTIC_KR_DOMAINS.some((d) => link.domain.includes(d))) {
    return "KR";
  }

  return home;
}

function earthSearchUrl(query: string) {
  return `https://earth.google.com/web/search/${encodeURIComponent(query)}`;
}

export function localizeTravelSpark(
  spark: LocalizedSparkLink,
  link: LinkRow,
  options?: { homeCountry?: CountryCode }
): LocalizedSparkLink {
  const focus = resolveTravelFocusCountry(link, options?.homeCountry);
  const profile = COUNTRY_PROFILES[focus];

  if (spark.id === "spark-google-earth") {
    return {
      ...spark,
      subtitle: `${profile.labelKo} 여행지 상상하기`,
      url: earthSearchUrl(profile.earthQuery),
    };
  }

  if (spark.id === "spark-atlas") {
    return {
      ...spark,
      id: `spark-hidden-${focus.toLowerCase()}`,
      title: profile.hiddenGem.title,
      subtitle: `${profile.labelKo} 숨은 명소 떠올리기`,
      url: profile.hiddenGem.url,
    };
  }

  return spark;
}

export function localizeTravelSparks(
  sparks: LocalizedSparkLink[],
  link: LinkRow,
  options?: { homeCountry?: CountryCode }
): LocalizedSparkLink[] {
  return sparks.map((spark) => localizeTravelSpark(spark, link, options));
}
