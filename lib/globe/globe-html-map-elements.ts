import type { ClassifiedGlobePin } from "@/lib/feed/experience-globe-ping-types";
import {
  isGlobeContextHubMapAnchor,
  type GlobeContextHubMapAnchor,
} from "@/lib/globe/context-hub/context-hub-globe-anchor-types";
import {
  isGlobeLodgingMapMarker,
  type GlobeLodgingMapMarker,
} from "@/lib/globe/context-hub/lodging-globe-marker-types";

export type GlobeHtmlMapElement =
  | ClassifiedGlobePin
  | GlobeLodgingMapMarker
  | GlobeContextHubMapAnchor;

export function readGlobeHtmlLat(element: GlobeHtmlMapElement): number {
  return element.lat;
}

export function readGlobeHtmlLng(element: GlobeHtmlMapElement): number {
  return element.lng;
}

export function mergeGlobeHtmlElements(input: {
  pins: readonly ClassifiedGlobePin[];
  lodgingMarkers: readonly GlobeLodgingMapMarker[];
  hubAnchors: readonly GlobeContextHubMapAnchor[];
  showLodgingMarkers: boolean;
  showHubAnchors: boolean;
}): GlobeHtmlMapElement[] {
  const merged: GlobeHtmlMapElement[] = [...input.pins];
  if (input.showHubAnchors && input.hubAnchors.length > 0) {
    merged.push(...input.hubAnchors);
  }
  if (input.showLodgingMarkers && input.lodgingMarkers.length > 0) {
    merged.push(...input.lodgingMarkers);
  }
  return merged;
}

export function isClassifiedGlobePin(
  element: GlobeHtmlMapElement,
): element is ClassifiedGlobePin {
  return !isGlobeLodgingMapMarker(element) && !isGlobeContextHubMapAnchor(element);
}
