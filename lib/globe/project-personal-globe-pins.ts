import { listPersonalGlobePinsForViewer } from "@/lib/globe/list-pins-for-viewer";
import type {
  PersonalGlobePin,
  PersonalGlobePinViewer,
} from "@/lib/globe/personal-globe-pin-types";
import { listPersonalGlobePins } from "@/lib/globe/personal-globe-pin-store";
import { globeViewForSharedPins } from "@/lib/peer-chat/globe-view-for-shared-pins";
import type { ClassifiedGlobePin } from "@/lib/feed/experience-globe-ping-types";
import { projectLatLngToMapPercent } from "@/lib/experience-graph/resolve-place-coordinates";
import type { SpatialGlobeView } from "@/lib/experience-graph/spatial-media-types";

function pinKindFromCounts(pin: PersonalGlobePin): ClassifiedGlobePin["kind"] {
  if (pin.videoCount > 0 && pin.photoCount === 0) {
    return "video";
  }
  if (pin.photoCount > 0) {
    return "photo";
  }
  return "place";
}

export function projectPersonalGlobeClassifiedPin(
  pin: PersonalGlobePin,
  viewer: PersonalGlobePinViewer,
): ClassifiedGlobePin {
  const map = projectLatLngToMapPercent(pin.lat, pin.lng);
  const locked = !viewer.isOwner && pin.acl.viewerPeerThreadIds.length === 0;
  return {
    id: pin.pinId,
    kind: pinKindFromCounts(pin),
    label: pin.experienceTitle,
    lat: pin.lat,
    lng: pin.lng,
    pinX: map.x,
    pinY: map.y,
    sourceEventId: pin.eventId,
    emphasis: "primary",
    pinShape: "slot",
    slot: {
      experienceTitle: pin.experienceTitle,
      photoCount: pin.photoCount,
      videoCount: pin.videoCount,
      locked,
    },
  };
}

export function projectPersonalGlobeClassifiedPins(
  viewer: PersonalGlobePinViewer,
  pins: readonly PersonalGlobePin[] = listPersonalGlobePins(),
): ClassifiedGlobePin[] {
  return listPersonalGlobePinsForViewer(pins, viewer).map((pin) =>
    projectPersonalGlobeClassifiedPin(pin, viewer),
  );
}

export function globeViewForPersonalPins(
  classified: readonly ClassifiedGlobePin[],
  fallbackLabel = "내 지구본",
): SpatialGlobeView {
  if (classified.length === 0) {
    return globeViewForSharedPins([]);
  }
  const view = globeViewForSharedPins(classified);
  if (classified.length > 1) {
    return {
      ...view,
      placeLabel: `${fallbackLabel} · 핀 ${classified.length}개`,
    };
  }
  return { ...view, placeLabel: classified[0]!.label };
}
