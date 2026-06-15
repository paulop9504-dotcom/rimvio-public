import type {
  RankedSurface,
  SurfaceChannel,
  SurfaceRouteMap,
} from "@/lib/surface-engine/surface-contract";
import { capProminentSurfaces } from "@/lib/surface-engine/surface-law";

const FEED_CAP = 5;
const CHAT_CAP = 3;
const CALENDAR_CAP = 5;

export type SurfaceRouterContext = {
  activeChannel?: SurfaceChannel;
};

/**
 * Route ranked surfaces to FEED / CHAT / CALENDAR using one contract.
 */
export function routeSurfacesToChannels(
  surfaces: readonly RankedSurface[],
  context: SurfaceRouterContext = {},
): SurfaceRouteMap {
  const capped = capProminentSurfaces(surfaces);
  const feed: RankedSurface[] = [];
  const chat: RankedSurface[] = [];
  const calendar: RankedSurface[] = [];

  for (const surface of capped) {
    if (surface.visibility === "hidden" || surface.visibility === "muted") {
      continue;
    }

    const hasSchedule = surface.events.some((event) => Boolean(event.startAt));
    if (hasSchedule) {
      calendar.push(surface);
    }
    if (surface.type === "goal" || surface.type === "reminder") {
      chat.push(surface);
    }
    feed.push(surface);
  }

  const sortByScore = (list: RankedSurface[]) =>
    [...list].sort(
      (a, b) => b.priority.surfacePriorityScore - a.priority.surfacePriorityScore,
    );

  const routes: SurfaceRouteMap = {
    FEED: sortByScore(feed).slice(0, FEED_CAP),
    CHAT: sortByScore(chat).slice(0, CHAT_CAP),
    CALENDAR: sortByScore(calendar).slice(0, CALENDAR_CAP),
  };

  if (context.activeChannel === "CHAT" && routes.CHAT.length > 0) {
    return routes;
  }

  return routes;
}

/** Pick surfaces for a single channel (feed, chat, or calendar shell). */
export function selectSurfacesForChannel(
  routes: SurfaceRouteMap,
  channel: SurfaceChannel,
): readonly RankedSurface[] {
  return routes[channel];
}
