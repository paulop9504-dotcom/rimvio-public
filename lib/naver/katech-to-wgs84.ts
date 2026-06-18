/** Naver Local Search mapx/mapy → WGS84 lat/lng. */
export function katechToLatLng(
  mapx: string | number,
  mapy: string | number
): { lat: number; lng: number } | null {
  const x = Number(mapx);
  const y = Number(mapy);
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return null;
  }

  // Current Naver Local API: WGS84 degrees × 10^7 (e.g. 1269789891 → 126.9789891)
  if (x >= 1_000_000_000 || y >= 100_000_000) {
    const lng = x / 10_000_000;
    const lat = y / 10_000_000;
    if (isKoreaLatLng(lat, lng)) {
      return { lat, lng };
    }
  }

  // Legacy KATEC grid (EPSG:5174) — smaller integer pairs
  return katecGridToLatLng(x, y);
}

function isKoreaLatLng(lat: number, lng: number): boolean {
  return lat >= 33 && lat <= 39.5 && lng >= 124 && lng <= 132.5;
}

function katecGridToLatLng(x: number, y: number): { lat: number; lng: number } | null {
  const RE = 6371.00877;
  const GRID = 5.0;
  const SLAT1 = 30.0;
  const SLAT2 = 60.0;
  const OLON = 126.0;
  const OLAT = 38.0;
  const XO = 43;
  const YO = 136;

  const DEGRAD = Math.PI / 180.0;
  const RADDEG = 180.0 / Math.PI;

  const re = RE / GRID;
  const slat1 = SLAT1 * DEGRAD;
  const slat2 = SLAT2 * DEGRAD;
  const olon = OLON * DEGRAD;
  const olat = OLAT * DEGRAD;

  let sn =
    Math.tan(Math.PI * 0.25 + slat2 * 0.5) / Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) / Math.log(sn);
  let sf = Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sf = (Math.pow(sf, sn) * Math.cos(slat1)) / sn;
  let ro = Math.tan(Math.PI * 0.25 + olat * 0.5);
  ro = (re * sf) / Math.pow(ro, sn);

  const xn = x - XO;
  const yn = ro - y + YO;
  const ra = Math.sqrt(xn * xn + yn * yn);
  const alat = 2 * Math.atan(Math.pow((re * sf) / ra, 1 / sn)) - Math.PI * 0.5;

  let theta: number;
  if (Math.abs(xn) <= 0.0) {
    theta = 0.0;
  } else if (Math.abs(yn) <= 0.0) {
    theta = Math.PI * 0.5;
    if (xn < 0.0) {
      theta = -theta;
    }
  } else {
    theta = Math.atan2(xn, yn);
  }

  const alon = theta / sn + olon;
  const lat = alat * RADDEG;
  const lng = alon * RADDEG;

  if (!isKoreaLatLng(lat, lng)) {
    return null;
  }

  return { lat, lng };
}
