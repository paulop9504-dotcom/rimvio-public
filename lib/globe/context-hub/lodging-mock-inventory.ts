import type { ContextLodgingInventoryRow } from "@/lib/globe/context-hub/lodging-resource-types";

/** Demo inventory — absolute coords for 대전 regression tests. */
export const DAEJEON_LODGING_MOCK: readonly ContextLodgingInventoryRow[] = [
  {
    placeId: "dj-yuseong-spa",
    name: "유성온천 스파 호텔",
    lat: 36.3554,
    lng: 127.2983,
    priceKrw: 89000,
    partnerLabel: "demo",
    images: [
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=640&q=80",
    ],
    videoUrl: null,
  },
  {
    placeId: "dj-station-central",
    name: "대전역 센트럴 스테이",
    lat: 36.3325,
    lng: 127.4347,
    priceKrw: 72000,
    partnerLabel: "demo",
    images: [
      "https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=640&q=80",
    ],
    videoUrl: null,
  },
  {
    placeId: "dj-kaist-inn",
    name: "카이스트 인근 게스트하우스",
    lat: 36.3741,
    lng: 127.3604,
    priceKrw: 54000,
    partnerLabel: "demo",
    images: [
      "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=640&q=80",
    ],
    videoUrl: null,
  },
  {
    placeId: "dj-expo-lake",
    name: "엑스포 호수뷰 펜션",
    lat: 36.3892,
    lng: 127.4121,
    priceKrw: 98000,
    partnerLabel: "demo",
    images: [
      "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=640&q=80",
    ],
    videoUrl: null,
  },
  {
    placeId: "dj-sintanjin-rest",
    name: "신탄진 휴게 스테이",
    lat: 36.4568,
    lng: 127.3055,
    priceKrw: 61000,
    partnerLabel: "demo",
    images: [
      "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=640&q=80",
    ],
    videoUrl: null,
  },
];

type LodgingMockTemplate = {
  id: string;
  name: string;
  dLat: number;
  dLng: number;
  priceKrw: number;
  image: string;
};

const LODGING_MOCK_TEMPLATES: readonly LodgingMockTemplate[] = [
  {
    id: "spa",
    name: "스파 호텔",
    dLat: 0.018,
    dLng: -0.012,
    priceKrw: 89000,
    image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=640&q=80",
  },
  {
    id: "central",
    name: "센트럴 스테이",
    dLat: -0.008,
    dLng: 0.022,
    priceKrw: 72000,
    image: "https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=640&q=80",
  },
  {
    id: "guest",
    name: "게스트하우스",
    dLat: 0.012,
    dLng: 0.008,
    priceKrw: 54000,
    image: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=640&q=80",
  },
  {
    id: "view",
    name: "뷰 펜션",
    dLat: 0.025,
    dLng: 0.015,
    priceKrw: 98000,
    image: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=640&q=80",
  },
  {
    id: "rest",
    name: "휴게 스테이",
    dLat: -0.015,
    dLng: -0.018,
    priceKrw: 61000,
    image: "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=640&q=80",
  },
];

/** Hub factory mock — spread around context destination, not hardcoded 대전. */
export function resolveLodgingMockForPlace(
  placeLabel: string,
  anchor: { lat: number; lng: number },
): readonly ContextLodgingInventoryRow[] {
  const place = placeLabel.trim();
  if (/대전|유성|신탄진|kaist|카이스트/iu.test(place)) {
    return DAEJEON_LODGING_MOCK;
  }

  const prefix = place.slice(0, 12) || "숙소";
  return LODGING_MOCK_TEMPLATES.map((template, index) => ({
    placeId: `${template.id}:${anchor.lat.toFixed(3)}:${index}`,
    name: `${prefix} ${template.name}`,
    lat: anchor.lat + template.dLat,
    lng: anchor.lng + template.dLng,
    priceKrw: template.priceKrw,
    partnerLabel: "demo",
    images: [template.image],
    videoUrl: null,
  }));
}
