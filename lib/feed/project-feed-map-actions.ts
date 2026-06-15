import {
  buildGoogleEarthAction,
  buildGoogleMapsOpenAction,
  isPlaceRelatedUrl,
} from "@/lib/resolvers/deep-links";
import {
  isDomesticMapAction,
  isDomesticMapPlace,
  parseGoogleMapCoords,
} from "@/lib/resolvers/place-map-region";
import type { LinkActionItem, LinkRow } from "@/types/database";

function dedupeActions(actions: LinkActionItem[]) {
  const seen = new Set<string>();
  const next: LinkActionItem[] = [];

  for (const action of actions) {
    const key = `${action.label}|${action.href ?? ""}|${action.kind}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    next.push(action);
  }

  return next;
}

/** Read-path projection — swap KR map apps for Google on overseas places. */
export function projectFeedMapActions(
  link: Pick<LinkRow, "original_url" | "title">,
  actions: LinkActionItem[]
): LinkActionItem[] {
  if (!isPlaceRelatedUrl(link.original_url)) {
    return actions;
  }

  const placeName = link.title?.trim() || null;
  if (
    isDomesticMapPlace({
      sourceUrl: link.original_url,
      title: link.title,
      placeName,
    })
  ) {
    return actions;
  }

  const coords = parseGoogleMapCoords(link.original_url);
  const filtered = actions.filter((action) => !isDomesticMapAction(action));
  const googlePrimary = buildGoogleMapsOpenAction(link.original_url, placeName);
  const googleEarth =
    placeName || coords
      ? buildGoogleEarthAction(placeName ?? "place", coords)
      : null;

  const hasGooglePrimary = filtered.some((action) =>
    /google\.com\/maps|maps\.google|earth\.google/i.test(action.href ?? "")
  );

  const projected = [
    ...(hasGooglePrimary ? [] : [googlePrimary]),
    ...(googleEarth ? [googleEarth] : []),
    ...filtered,
  ];

  return dedupeActions(projected.length > 0 ? projected : [googlePrimary]);
}
