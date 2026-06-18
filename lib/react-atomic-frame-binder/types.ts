import type { FrameDiff } from "@/lib/cognitive-streaming-cycle/types";
import type {
  CalendarUiItem,
  DockUiItem,
  NarrationUiItem,
  SurfaceUiState,
  TimelineUiItem,
} from "@/lib/surface-render-contract/types";

export type CognitiveFrame = {
  tickId: string;
  uiState: SurfaceUiState;
  frameDiff: FrameDiff;
  timestamp: number;
  uiCommit: boolean;
};

export type CommittedFrameSnapshot = {
  tickId: string | null;
  uiState: SurfaceUiState;
  timestamp: number;
};

export const SURFACE_KEYS = ["CALENDAR", "DOCK", "TIMELINE", "NARRATION"] as const;

export type SurfaceKey = (typeof SURFACE_KEYS)[number];

export function createEmptyCommittedSnapshot(timestamp: number = 0): CommittedFrameSnapshot {
  return {
    tickId: null,
    uiState: {
      CALENDAR: [],
      DOCK: [],
      TIMELINE: [],
      NARRATION: [],
    },
    timestamp,
  };
}

export type CalendarUiItemSnapshot = Readonly<CalendarUiItem>;
export type DockUiItemSnapshot = Readonly<DockUiItem>;
export type TimelineUiItemSnapshot = Readonly<TimelineUiItem>;
export type NarrationUiItemSnapshot = Readonly<NarrationUiItem>;

export type ImmutableSurfaceUiState = {
  readonly CALENDAR: readonly CalendarUiItemSnapshot[];
  readonly DOCK: readonly DockUiItemSnapshot[];
  readonly TIMELINE: readonly TimelineUiItemSnapshot[];
  readonly NARRATION: readonly NarrationUiItemSnapshot[];
};
