import {
  ARCHIVE_BAG_ANGLE_DEG,
  FIVE_PEER_HUB_ANGLES_DEG,
  hubPolarPercent,
} from "@/lib/context/five-peer-hub-layout";
import type { PinnedSlotIndex } from "@/lib/context/peer-thread-types";

const POSITIONS_KEY = "rimvio-five-peer-hub-positions";

function positionsStorageKey(): string {
  if (typeof window === "undefined") {
    return POSITIONS_KEY;
  }
  const portrait =
    window.matchMedia?.("(orientation: portrait)").matches ??
    window.innerHeight >= window.innerWidth;
  return portrait ? `${POSITIONS_KEY}:portrait` : `${POSITIONS_KEY}:landscape`;
}

export type HubNodePoint = { x: number; y: number };

export type HubNodePositions = {
  center: HubNodePoint;
  slots: Record<PinnedSlotIndex, HubNodePoint>;
  archiveBag: HubNodePoint;
};

function defaultSlotPositions(): Record<PinnedSlotIndex, HubNodePoint> {
  const slots = {} as Record<PinnedSlotIndex, HubNodePoint>;
  FIVE_PEER_HUB_ANGLES_DEG.forEach((angleDeg, index) => {
    const { leftPct, topPct } = hubPolarPercent(angleDeg);
    slots[index as PinnedSlotIndex] = { x: leftPct, y: topPct };
  });
  return slots;
}

export function defaultArchiveBagPosition(): HubNodePoint {
  const { leftPct, topPct } = hubPolarPercent(ARCHIVE_BAG_ANGLE_DEG);
  return { x: leftPct, y: Math.min(topPct + 6, 88) };
}

export function defaultHubNodePositions(): HubNodePositions {
  return {
    center: { x: 50, y: 46 },
    slots: defaultSlotPositions(),
    archiveBag: defaultArchiveBagPosition(),
  };
}

function isValidPoint(value: unknown): value is HubNodePoint {
  if (!value || typeof value !== "object") {
    return false;
  }
  const point = value as HubNodePoint;
  return (
    typeof point.x === "number" &&
    typeof point.y === "number" &&
    Number.isFinite(point.x) &&
    Number.isFinite(point.y)
  );
}

function normalizePositions(raw: unknown): HubNodePositions {
  const defaults = defaultHubNodePositions();
  if (!raw || typeof raw !== "object") {
    return defaults;
  }

  const parsed = raw as Partial<HubNodePositions>;
  const center = isValidPoint(parsed.center) ? parsed.center : defaults.center;
  const slots = { ...defaults.slots };

  if (parsed.slots && typeof parsed.slots === "object") {
    for (let i = 0; i < 5; i += 1) {
      const slotIndex = i as PinnedSlotIndex;
      const candidate = (parsed.slots as Record<number, unknown>)[slotIndex];
      if (isValidPoint(candidate)) {
        slots[slotIndex] = candidate;
      }
    }
  }

  const archiveBag = isValidPoint(parsed.archiveBag)
    ? parsed.archiveBag
    : defaults.archiveBag;

  return { center, slots, archiveBag };
}

export type HubDragBounds = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

export function clampHubPoint(point: HubNodePoint, bounds?: HubDragBounds): HubNodePoint {
  const minX = bounds?.minX ?? 0;
  const maxX = bounds?.maxX ?? 100;
  const minY = bounds?.minY ?? 0;
  const maxY = bounds?.maxY ?? 100;

  return {
    x: Math.min(maxX, Math.max(minX, point.x)),
    y: Math.min(maxY, Math.max(minY, point.y)),
  };
}

/**
 * Edge padding (%) — use the full hub rectangle (especially on tall phones).
 * Older “centered square” inset made portrait drag feel stuck (~35% vertical range).
 */
export function resolveHubDragBounds(
  containerWidthPx: number,
  containerHeightPx: number,
  target: "center" | "peer",
): HubDragBounds {
  const width = Math.max(containerWidthPx, 1);
  const height = Math.max(containerHeightPx, 1);
  const aspect = height / width;

  const halfHeightPx = target === "center" ? 50 : 36;
  const halfWidthPx = target === "center" ? 38 : 26;

  let padX = (halfWidthPx / width) * 100;
  let padY = (halfHeightPx / height) * 100;

  const minPad = aspect > 1.15 ? 6 : 8;
  padX = Math.min(14, Math.max(minPad, padX));
  padY = Math.min(12, Math.max(minPad, padY));

  return {
    minX: padX,
    maxX: 100 - padX,
    minY: padY,
    maxY: 100 - padY,
  };
}

export function clampHubPositionsToBounds(
  positions: HubNodePositions,
  containerWidthPx: number,
  containerHeightPx: number,
): HubNodePositions {
  return {
    center: clampHubPoint(
      positions.center,
      resolveHubDragBounds(containerWidthPx, containerHeightPx, "center"),
    ),
    slots: {
      0: clampHubPoint(positions.slots[0], resolveHubDragBounds(containerWidthPx, containerHeightPx, "peer")),
      1: clampHubPoint(positions.slots[1], resolveHubDragBounds(containerWidthPx, containerHeightPx, "peer")),
      2: clampHubPoint(positions.slots[2], resolveHubDragBounds(containerWidthPx, containerHeightPx, "peer")),
      3: clampHubPoint(positions.slots[3], resolveHubDragBounds(containerWidthPx, containerHeightPx, "peer")),
      4: clampHubPoint(positions.slots[4], resolveHubDragBounds(containerWidthPx, containerHeightPx, "peer")),
    },
    archiveBag: clampHubPoint(
      positions.archiveBag ?? defaultArchiveBagPosition(),
      resolveHubDragBounds(containerWidthPx, containerHeightPx, "peer"),
    ),
  };
}

export function readHubNodePositions(): HubNodePositions {
  if (typeof window === "undefined") {
    return defaultHubNodePositions();
  }

  try {
    const raw =
      localStorage.getItem(positionsStorageKey()) ??
      localStorage.getItem(POSITIONS_KEY);
    if (!raw) {
      return defaultHubNodePositions();
    }
    return normalizePositions(JSON.parse(raw));
  } catch {
    return defaultHubNodePositions();
  }
}

export function writeHubNodePositions(positions: HubNodePositions): void {
  if (typeof window === "undefined") {
    return;
  }

  const key = positionsStorageKey();
  localStorage.setItem(key, JSON.stringify(positions));
}
