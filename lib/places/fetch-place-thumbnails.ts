import {
  fetchGoogleCseWebThumbnail,
  isGoogleCseConfigured,
} from "@/lib/vision/google-cse-web-thumbnail";
import { isNaverSearchConfigured } from "@/lib/naver/config";
import { naverSearch } from "@/lib/naver/search-api";
import type { NaverSearchItem } from "@/lib/naver/types";
import type { PlaceCandidate } from "@/lib/context-resolver/places/types";

const MAX_FOOD_PHOTOS = 6;

const STOREFRONT_NOISE =
  /(?:간판|외관|입구|storefront|facade|logo|로고|전경|야경|building)/iu;

function imageUrlFromNaverItem(item: NaverSearchItem): string | null {
  const link = item.link?.trim();
  const thumbnail = item.thumbnail?.trim();
  return link || thumbnail || null;
}

function isLikelyFoodPhoto(url: string, title = ""): boolean {
  const hay = `${url} ${title}`.toLowerCase();
  if (STOREFRONT_NOISE.test(hay)) {
    return false;
  }
  if (/\.(gif|svg)(\?|$)/i.test(url)) {
    return false;
  }
  return true;
}

async function fetchNaverImageUrls(query: string, display: number): Promise<string[]> {
  if (!isNaverSearchConfigured()) {
    return [];
  }

  try {
    const result = await naverSearch("image", query, { display, sort: "sim" });
    const urls: string[] = [];
    const seen = new Set<string>();

    for (const item of result.items) {
      const url = imageUrlFromNaverItem(item);
      const title = item.title ?? "";
      if (!url || seen.has(url) || !isLikelyFoodPhoto(url, title)) {
        continue;
      }
      seen.add(url);
      urls.push(url);
    }

    return urls;
  } catch {
    return [];
  }
}

function buildFoodPhotoQueries(input: {
  name: string;
  anchor: string | null;
  cuisine?: string | null;
}): string[] {
  const { name, anchor, cuisine } = input;
  const queries = [
    cuisine ? `${name} ${cuisine}` : null,
    cuisine ? `${anchor ?? ""} ${cuisine}`.trim() : null,
    `${name} 메뉴`,
    `${name} 음식`,
    anchor ? `${name} ${anchor} 맛집` : null,
    anchor ? `${anchor} ${name} 음식` : null,
    `${name} 맛집`,
  ].filter((query): query is string => Boolean(query?.trim()));

  return [...new Set(queries)];
}

/** Naver Image (+ optional CSE) — appetizing food shots, not storefront only. */
export async function fetchFoodPhotoUrls(input: {
  name: string;
  anchor: string | null;
  cuisine?: string | null;
}): Promise<string[]> {
  const seen = new Set<string>();
  const urls: string[] = [];

  for (const query of buildFoodPhotoQueries(input)) {
    if (urls.length >= MAX_FOOD_PHOTOS) {
      break;
    }

    const batch = await fetchNaverImageUrls(query, MAX_FOOD_PHOTOS);
    for (const url of batch) {
      if (seen.has(url)) {
        continue;
      }
      seen.add(url);
      urls.push(url);
      if (urls.length >= MAX_FOOD_PHOTOS) {
        break;
      }
    }
  }

  if (urls.length === 0 && isGoogleCseConfigured()) {
    const fallbackQuery = input.cuisine
      ? `${input.name} ${input.cuisine} food`
      : `${input.name} food menu`;
    const fromGoogle = await fetchGoogleCseWebThumbnail(fallbackQuery);
    if (fromGoogle) {
      urls.push(fromGoogle);
    }
  }

  return urls;
}

async function resolvePlacePhotos(input: {
  name: string;
  anchor: string | null;
  cuisine?: string | null;
}): Promise<{ thumbnail_url: string | null; photo_urls: string[] }> {
  const photo_urls = await fetchFoodPhotoUrls(input);
  return {
    photo_urls,
    thumbnail_url: photo_urls[0] ?? null,
  };
}

/** Attach hero thumbnail + food photo gallery from Naver Image / CSE. */
export async function attachPlaceThumbnails(
  candidates: PlaceCandidate[],
  input: string | null | { anchor: string | null; cuisine?: string | null }
): Promise<PlaceCandidate[]> {
  const anchor = typeof input === "string" || input === null ? input : input.anchor;
  const cuisine =
    typeof input === "object" && input !== null ? input.cuisine ?? null : null;

  return Promise.all(
    candidates.map(async (place) => {
      if (place.photo_urls?.length && place.thumbnail_url) {
        return place;
      }

      const resolved = await resolvePlacePhotos({
        name: place.name,
        anchor,
        cuisine,
      });

      return {
        ...place,
        thumbnail_url: place.thumbnail_url ?? resolved.thumbnail_url,
        photo_urls:
          place.photo_urls && place.photo_urls.length > 0
            ? place.photo_urls
            : resolved.photo_urls,
      };
    })
  );
}
