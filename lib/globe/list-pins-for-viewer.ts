import type {
  PersonalGlobePin,
  PersonalGlobePinViewer,
} from "@/lib/globe/personal-globe-pin-types";

/** Pin-level ACL — owner sees all; peers see allowed pins only. */
export function canViewerSeePersonalGlobePin(
  pin: PersonalGlobePin,
  viewer: PersonalGlobePinViewer,
): boolean {
  if (viewer.isOwner) {
    return true;
  }
  const threadId = viewer.viewerPeerThreadId?.trim();
  if (!threadId) {
    return false;
  }
  return pin.acl.viewerPeerThreadIds.some((row) => row.trim() === threadId);
}

export function listPersonalGlobePinsForViewer(
  pins: readonly PersonalGlobePin[],
  viewer: PersonalGlobePinViewer,
): PersonalGlobePin[] {
  return pins.filter((pin) => canViewerSeePersonalGlobePin(pin, viewer));
}
