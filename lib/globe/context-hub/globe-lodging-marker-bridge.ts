/** Sync globe lodging markers ↔ hub carousel without coupling components. */

import { dispatchGlobeMapMediaFocus } from "@/lib/globe/globe-map-media-focus-bridge";

export const GLOBE_LODGING_FOCUS = "rimvio:globe-lodging-focus";
export const GLOBE_LODGING_FOCUS_STAGE = "rimvio:globe-lodging-focus-stage";

export type GlobeLodgingFocusDetail = {
  resourceId: string;
  carouselIndex: number;
  /** map_marker opens full focus stage; carousel/strip sync markers only. */
  source?: "map_marker" | "carousel" | "strip";
};

export type GlobeLodgingFocusStageDetail = {
  open: boolean;
};

export function dispatchGlobeLodgingFocus(detail: GlobeLodgingFocusDetail): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(
    new CustomEvent<GlobeLodgingFocusDetail>(GLOBE_LODGING_FOCUS, { detail }),
  );
}

export function subscribeGlobeLodgingFocus(
  listener: (detail: GlobeLodgingFocusDetail) => void,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<GlobeLodgingFocusDetail>).detail;
    if (!detail?.resourceId) {
      return;
    }
    listener(detail);
  };
  window.addEventListener(GLOBE_LODGING_FOCUS, handler);
  return () => window.removeEventListener(GLOBE_LODGING_FOCUS, handler);
}

export function dispatchGlobeLodgingFocusStage(open: boolean): void {
  dispatchGlobeMapMediaFocus(open, "lodging");
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(
    new CustomEvent<GlobeLodgingFocusStageDetail>(GLOBE_LODGING_FOCUS_STAGE, {
      detail: { open },
    }),
  );
}

export function subscribeGlobeLodgingFocusStage(
  listener: (detail: GlobeLodgingFocusStageDetail) => void,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const handler = (event: Event) => {
    listener((event as CustomEvent<GlobeLodgingFocusStageDetail>).detail);
  };
  window.addEventListener(GLOBE_LODGING_FOCUS_STAGE, handler);
  return () => window.removeEventListener(GLOBE_LODGING_FOCUS_STAGE, handler);
}
