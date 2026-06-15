import { resolveNavigationPlaceName } from "@/lib/action-chat/resolve-navigation-place";
import type { FindPlaceIntent, PlaceDiscoveryCriteria, PlaceVibe } from "@/lib/context-resolver/places/types";

/** @deprecated use parse-find-place-intent.ts */
export type FindCafeEvent = {
  intent: FindPlaceIntent;
  vibe: PlaceVibe;
  raw_message: string;
};

export {
  isFindCafeQuery,
  isPlaceRecommendationQuery,
  parseFindCafeIntent,
  parseFindPlaceIntent,
  buildCafeDiscoveryCriteria,
  buildPlaceDiscoveryCriteria,
  type FindPlaceEvent,
} from "@/lib/context-resolver/discovery/parse-find-place-intent";
