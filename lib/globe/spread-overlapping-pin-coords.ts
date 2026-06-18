/** ~150m — pins closer than this are fanned into a sunflower ring. */
export const GLOBE_PIN_OVERLAP_RADIUS_M = 150;

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const BASE_RADIUS_M = 85;
const RADIUS_STEP_M = 48;

export type GlobePinCoord = {
  id: string;
  lat: number;
  lng: number;
};

export type SpreadGlobePinCoord = GlobePinCoord & {
  spreadLat: number;
  spreadLng: number;
  overlapGroupSize: number;
};

function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function offsetMeters(lat: number, dxM: number, dyM: number): { lat: number; lng: number } {
  const dLat = dyM / 111_320;
  const cosLat = Math.cos((lat * Math.PI) / 180);
  const dLng = dxM / (111_320 * Math.max(0.2, Math.abs(cosLat)));
  return { lat: dLat, lng: dLng };
}

function buildOverlapGroups(pins: readonly GlobePinCoord[]): GlobePinCoord[][] {
  if (pins.length === 0) {
    return [];
  }

  const byId = new Map(pins.map((pin) => [pin.id, pin]));
  const parent = new Map(pins.map((pin) => [pin.id, pin.id]));

  const find = (id: string): string => {
    let root = id;
    while (parent.get(root) !== root) {
      root = parent.get(root)!;
    }
    let cursor = id;
    while (parent.get(cursor) !== root) {
      const next = parent.get(cursor)!;
      parent.set(cursor, root);
      cursor = next;
    }
    return root;
  };

  const union = (leftId: string, rightId: string) => {
    const leftRoot = find(leftId);
    const rightRoot = find(rightId);
    if (leftRoot !== rightRoot) {
      parent.set(rightRoot, leftRoot);
    }
  };

  for (let index = 0; index < pins.length; index += 1) {
    for (let other = index + 1; other < pins.length; other += 1) {
      const left = pins[index]!;
      const right = pins[other]!;
      if (
        haversineMeters(left.lat, left.lng, right.lat, right.lng) <=
        GLOBE_PIN_OVERLAP_RADIUS_M
      ) {
        union(left.id, right.id);
      }
    }
  }

  const grouped = new Map<string, GlobePinCoord[]>();
  for (const pin of pins) {
    const root = find(pin.id);
    const bucket = grouped.get(root) ?? [];
    bucket.push(byId.get(pin.id)!);
    grouped.set(root, bucket);
  }

  return [...grouped.values()];
}

/** Sunflower fan — keeps anchor coords, spreads display coords for tap targets. */
export function spreadOverlappingPinCoords(
  pins: readonly GlobePinCoord[],
): SpreadGlobePinCoord[] {
  if (pins.length === 0) {
    return [];
  }

  const groups = buildOverlapGroups(pins);
  const results: SpreadGlobePinCoord[] = [];

  for (const group of groups) {
    if (group.length === 1) {
      const pin = group[0]!;
      results.push({
        ...pin,
        spreadLat: pin.lat,
        spreadLng: pin.lng,
        overlapGroupSize: 1,
      });
      continue;
    }

    const sorted = [...group].sort((left, right) => left.id.localeCompare(right.id));
    const centroidLat =
      sorted.reduce((sum, pin) => sum + pin.lat, 0) / sorted.length;
    const centroidLng =
      sorted.reduce((sum, pin) => sum + pin.lng, 0) / sorted.length;

    sorted.forEach((pin, index) => {
      const angle = index * GOLDEN_ANGLE;
      const radiusM = BASE_RADIUS_M + Math.sqrt(index + 1) * RADIUS_STEP_M;
      const dxM = radiusM * Math.cos(angle);
      const dyM = radiusM * Math.sin(angle);
      const delta = offsetMeters(centroidLat, dxM, dyM);
      results.push({
        ...pin,
        spreadLat: centroidLat + delta.lat,
        spreadLng: centroidLng + delta.lng,
        overlapGroupSize: sorted.length,
      });
    });
  }

  return results.sort((left, right) => left.id.localeCompare(right.id));
}
