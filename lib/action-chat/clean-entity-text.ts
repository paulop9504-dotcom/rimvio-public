import { normalizeAddressPair, readDisplayAddress } from "@/lib/action-chat/normalize-address";
import { parseAddressQuery } from "@/lib/capture/parse-capture-fields";
import { extractPhoneFromText } from "@/lib/enrichers/extract-phone";
import { extractExplicitUrls } from "@/lib/screenshot/explicit-urls";
import type { NormalizedAddress } from "@/lib/action-chat/normalize-address";
import type { ExtractedPlaceInfo } from "@/lib/action-chat/entity-cleaner-types";
import {
  looksLikeNoisyPlaceLabel,
  resolveNavigationPlaceName,
} from "@/lib/action-chat/resolve-navigation-place";

const UI_NOISE_LINE =
  /^(펼쳐보기|접기|더보기|닫기|공유(?:하기)?|신고(?:하기)?|저장(?:하기)?|복사(?:하기)?|길찾기|리뷰(?:\s*\d*)?|사진(?:\s*\d*)?|지도|전화(?:걸기)?|홈페이지|키워드\s*선택|참여\s*인원|사용\s*안내|이용\s*안내|안내\s*사항|좋아요|팔로우|구독|알림\s*받기|최신순|추천순|거리순|필터|정렬|광고|스폰서|쿠폰\s*받기|예약(?:하기)?)$/i;

const UI_NOISE_INLINE =
  /참여\s*인원|키워드\s*선택|사용\s*안내|펼쳐보기|리뷰\s*\d+\s*개|사진\s*\d+\s*장|★+\s*\d|별점|평점\s*\d/i;

const ADDRESS_LINE =
  /(?:서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)[^\n]{4,90}/;

const ROAD_ADDRESS =
  /[가-힣A-Za-z0-9]+\s*(?:특별시|광역시|시|군|구)\s+[가-힣0-9\s\-]+(?:로|길|번길|동로)\s*\d+[^\n]{0,32}/;

const HOURS_LINE = /영업(?:시간)?|휴무|브레이크\s*타임|라스트\s*오더|open|closed/i;

const MAP_HOST =
  /(?:map\.|place\.|m\.place\.|kakaomap|kakao\.com\/link|naver\.com\/(?:map|local|p\/|search\.naver)|tmap\.)/i;

function normalizeLines(text: string) {
  return text
    .replace(/\u00a0/g, " ")
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function isUiNoiseLine(line: string) {
  if (UI_NOISE_LINE.test(line)) {
    return true;
  }
  if (UI_NOISE_INLINE.test(line) && line.length < 48) {
    return true;
  }
  if (/^\d+[\s,]*명$/.test(line)) {
    return true;
  }
  if (/^[\d,.]+\s*(km|m)$/.test(line)) {
    return true;
  }
  return false;
}

export function stripUiNoise(text: string) {
  const kept = normalizeLines(text).filter((line) => !isUiNoiseLine(line));
  return kept.join("\n");
}

function extractAddress(text: string) {
  const match = text.match(ADDRESS_LINE) ?? text.match(ROAD_ADDRESS);
  if (match?.[0]) {
    return normalizeAddressPair(match[0].replace(/\s+/g, " ").trim());
  }

  const fromParser = parseAddressQuery(text);
  return fromParser ? normalizeAddressPair(fromParser) : null;
}

function extractWebsite(text: string) {
  const urls = extractExplicitUrls(text);
  for (const url of urls) {
    if (MAP_HOST.test(url)) {
      continue;
    }
    if (/^https?:\/\//i.test(url)) {
      return url.replace(/[)\]}>,]+$/, "");
    }
  }
  return null;
}

function extractHours(text: string) {
  const line = normalizeLines(text).find((entry) => HOURS_LINE.test(entry));
  return line?.slice(0, 80) ?? null;
}

function inferIsOpen(text: string): boolean | null {
  if (/영업\s*중|영업중|open\s*now|지금\s*영업/i.test(text)) {
    return true;
  }
  if (/영업\s*종료|영업종료|휴무(?:일)?|closed|브레이크\s*타임/i.test(text)) {
    return false;
  }
  return null;
}

function splitNameBranch(raw: string) {
  const trimmed = raw.replace(/\s+/g, " ").trim();
  if (/(?:점|지점|본점|직영점)$/.test(trimmed)) {
    const parts = trimmed.split(/\s+/);
    if (parts.length >= 2) {
      const branch = parts.pop()!;
      return {
        name: parts.join(" "),
        branch,
      };
    }
  }
  return { name: trimmed, branch: null };
}

function extractPlaceName(
  cleanedText: string,
  address: NormalizedAddress | null,
  phone: string | null
) {
  const displayAddress = readDisplayAddress(address);
  const lines = normalizeLines(cleanedText);

  for (const line of lines) {
    if (displayAddress && line.includes(displayAddress)) {
      continue;
    }
    if (address?.nav && line.includes(address.nav)) {
      continue;
    }
    if (phone && line.includes(phone.replace(/-/g, ""))) {
      continue;
    }
    if (/^https?:\/\//i.test(line)) {
      continue;
    }
    if (HOURS_LINE.test(line) && line.length > 24) {
      continue;
    }
    if (ADDRESS_LINE.test(line) || ROAD_ADDRESS.test(line)) {
      continue;
    }
    if (/^\d{2,3}-\d{3,4}-\d{4}$/.test(line.replace(/\s/g, "-"))) {
      continue;
    }
    if (line.length >= 2 && line.length <= 32) {
      if (looksLikeNoisyPlaceLabel(line)) {
        const resolved = resolveNavigationPlaceName(line);
        if (resolved) {
          return splitNameBranch(resolved);
        }
        continue;
      }
      return splitNameBranch(line);
    }
  }

  const resolved = resolveNavigationPlaceName(cleanedText);
  if (resolved) {
    return splitNameBranch(resolved);
  }

  const firstChunk = cleanedText
    .replace(/https?:\/\/\S+/g, "")
    .split(/[\n,|·]/)[0]
    ?.trim();

  if (firstChunk && firstChunk.length >= 2 && firstChunk.length <= 40) {
    if (!looksLikeNoisyPlaceLabel(firstChunk)) {
      return splitNameBranch(firstChunk);
    }
  }

  return { name: null, branch: null };
}

export function extractPlaceEntities(rawText: string): ExtractedPlaceInfo {
  const cleaned = stripUiNoise(rawText);
  const phone = extractPhoneFromText(cleaned);
  const address = extractAddress(cleaned);
  const website = extractWebsite(cleaned);
  const hours = extractHours(cleaned);
  let { name, branch } = extractPlaceName(cleaned, address, phone);

  const resolvedLabel = resolveNavigationPlaceName(cleaned);
  if (resolvedLabel) {
    if (!name || looksLikeNoisyPlaceLabel(name) || name === cleaned.trim()) {
      ({ name, branch } = splitNameBranch(resolvedLabel));
    }
  } else if (name && looksLikeNoisyPlaceLabel(name)) {
    name = null;
    branch = null;
  }

  return {
    name,
    branch,
    address,
    phone,
    website,
    hours,
    is_open: inferIsOpen(cleaned),
  };
}

export function isMessyPlaceDump(text: string) {
  const trimmed = text.trim();
  if (trimmed.length < 24) {
    return false;
  }

  const lineCount = normalizeLines(trimmed).length;
  const hasNoise = UI_NOISE_INLINE.test(trimmed) || normalizeLines(trimmed).some(isUiNoiseLine);
  const info = extractPlaceEntities(trimmed);
  const entityCount = [info.phone, info.address?.display, info.website, info.name].filter(Boolean).length;

  return entityCount >= 2 && (lineCount >= 3 || hasNoise);
}
