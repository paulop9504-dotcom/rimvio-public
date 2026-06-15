import type { LocationSuggestion } from "@/lib/action-chat/confirmation-types";

const GALLERIA_DAEJEON: LocationSuggestion[] = [
  {
    id: "galleria-timeworld",
    label: "갤러리아 백화점 대전 타임월드점",
    place_name: "갤러리아",
    branch: "타임월드점",
    address: "대전 서구 둔산로 119",
  },
  {
    id: "galleria-centum",
    label: "갤러리아 센터시티점",
    place_name: "갤러리아",
    branch: "센터시티점",
    address: "대전 서구 둔산동 1016",
  },
  {
    id: "galleria-dunsan",
    label: "갤러리아 둔산점",
    place_name: "갤러리아",
    branch: "둔산점",
    address: "대전 서구 둔산동 1330",
  },
];

export function buildLocationSuggestions(input: {
  place_name?: string | null;
  address?: string | null;
  query?: string;
}): LocationSuggestion[] {
  const needle = [
    input.query,
    input.place_name,
    input.address,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (/갤러리아|galleria|둔산|타임월드|센터시티/.test(needle)) {
    return GALLERIA_DAEJEON;
  }

  if (/스타벅스|starbucks/.test(needle)) {
    return [
      {
        id: "sb-gangnam",
        label: "스타벅스 강남역점",
        place_name: "스타벅스",
        branch: "강남역점",
        address: "서울 강남구 강남대로 396",
      },
      {
        id: "sb-dunsan",
        label: "스타벅스 둔산점",
        place_name: "스타벅스",
        branch: "둔산점",
        address: "대전 서구 둔산로 100",
      },
    ];
  }

  return [];
}

export function filterLocationSuggestions(
  suggestions: LocationSuggestion[],
  query: string
) {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return suggestions;
  }

  return suggestions.filter(
    (item) =>
      item.label.toLowerCase().includes(needle) ||
      item.address.toLowerCase().includes(needle) ||
      item.branch?.toLowerCase().includes(needle)
  );
}
