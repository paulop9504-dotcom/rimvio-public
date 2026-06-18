/** Hide map pins / markers while photo or video focus overlay is open. */

export const GLOBE_MAP_MEDIA_FOCUS = "rimvio:globe-map-media-focus";

export type GlobeMapMediaFocusSource = "lodging" | "video";

export type GlobeMapMediaFocusDetail = {
  open: boolean;
};

const openSources = new Set<GlobeMapMediaFocusSource>();

function syncGlobeMapMediaFocus(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(
    new CustomEvent<GlobeMapMediaFocusDetail>(GLOBE_MAP_MEDIA_FOCUS, {
      detail: { open: openSources.size > 0 },
    }),
  );
}

export function dispatchGlobeMapMediaFocus(
  open: boolean,
  source: GlobeMapMediaFocusSource,
): void {
  if (typeof window === "undefined") {
    return;
  }
  if (open) {
    openSources.add(source);
  } else {
    openSources.delete(source);
  }
  syncGlobeMapMediaFocus();
}

export function subscribeGlobeMapMediaFocus(
  listener: (detail: GlobeMapMediaFocusDetail) => void,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const handler = (event: Event) => {
    listener((event as CustomEvent<GlobeMapMediaFocusDetail>).detail);
  };
  window.addEventListener(GLOBE_MAP_MEDIA_FOCUS, handler);
  return () => window.removeEventListener(GLOBE_MAP_MEDIA_FOCUS, handler);
}
