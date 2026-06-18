export function normalizePlaceNameKey(placeName: string) {
  return placeName
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function buildNmapRouteHref(input: {
  lat: number;
  lng: number;
  placeName: string;
}) {
  const params = new URLSearchParams({
    dlat: String(input.lat),
    dlng: String(input.lng),
    dname: input.placeName,
  });

  return `nmap://route/public?${params.toString()}`;
}
