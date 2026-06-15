import type { UnifiedCalendarOverlayRow } from "@/lib/calendar/calendar-view-types";
import type { RankedSurface, SurfaceType } from "@/lib/surface-engine/surface-contract";

export type FeedTodaySurfaceSlot = {
  kind: "surface";
  id: string;
  surface: RankedSurface;
};

export type FeedTodayCalendarSlot = {
  kind: "calendar";
  id: string;
  row: UnifiedCalendarOverlayRow;
  slotType: SurfaceType;
};

export type FeedTodaySlot = FeedTodaySurfaceSlot | FeedTodayCalendarSlot;
