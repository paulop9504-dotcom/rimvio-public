import { stripHtmlTags } from "@/lib/commerce/commerce-cleaner";
import { katechToLatLng } from "@/lib/naver/katech-to-wgs84";
import { naverSearch } from "@/lib/naver/search-api";
import type { NaverLocalItem } from "@/lib/naver/types";
import type { PlaceCandidate, PlaceVibe } from "@/lib/context-resolver/places/types";

function parseLocalItem(item: Record<string, string>): NaverLocalItem {
  return {
    title: stripHtmlTags(item.title ?? ""),
    link: item.link ?? "",
    category: stripHtmlTags(item.category ?? ""),
    description: stripHtmlTags(item.description ?? ""),
    telephone: item.telephone ?? "",
    address: item.address ?? "",
    roadAddress: item.roadAddress ?? "",
    mapx: item.mapx ?? "",
    mapy: item.mapy ?? "",
  };
}

function inferVibesFromName(name: string): PlaceVibe[] {
  const vibes: PlaceVibe[] = [];
  if (/조용|study|스터디|무드|book/i.test(name)) {
    vibes.push("quiet", "work");
  }
  if (/라운지|lounge|바|bar/i.test(name)) {
    vibes.push("lively");
  }
  if (vibes.length === 0) {
    vibes.push("unknown");
  }
  return vibes;
}

function stablePlaceId(item: NaverLocalItem): string {
  const seed = `${item.title}|${item.address}|${item.mapx}|${item.mapy}`;
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(index);
    hash |= 0;
  }
  return `naver-local-${Math.abs(hash)}`;
}

export function naverLocalItemToPlaceCandidate(item: NaverLocalItem): PlaceCandidate | null {
  const name = item.title.trim();
  if (!name) {
    return null;
  }

  const coords = katechToLatLng(item.mapx, item.mapy);
  if (!coords) {
    return null;
  }

  return {
    place_id: stablePlaceId(item),
    name,
    address: item.roadAddress.trim() || item.address.trim() || null,
    lat: coords.lat,
    lng: coords.lng,
    rating: 0,
    open_now: true,
    vibes: inferVibesFromName(name),
    phone: item.telephone.trim() || null,
    maps_url: item.link.trim() || null,
    naver_category: item.category.trim() || null,
    description: item.description.trim() || null,
  };
}

export async function fetchNaverLocalPlaceCandidates(input: {
  query: string;
  display?: number;
}): Promise<PlaceCandidate[]> {
  const result = await naverSearch("local", input.query, {
    display: input.display ?? 5,
    sort: "comment",
  });

  return result.items
    .map((item) => naverLocalItemToPlaceCandidate(parseLocalItem(item)))
    .filter((item): item is PlaceCandidate => item !== null);
}
