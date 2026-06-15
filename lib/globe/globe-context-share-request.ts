/** Pin card share chip → React share sheet. */
export const GLOBE_CONTEXT_SHARE_REQUEST = "rimvio-globe-context-share-request";

export type GlobeContextShareRequestDetail = {
  eventId: string;
  pinId: string;
};

export function dispatchGlobeContextShareRequest(detail: GlobeContextShareRequestDetail) {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(
    new CustomEvent<GlobeContextShareRequestDetail>(GLOBE_CONTEXT_SHARE_REQUEST, {
      detail,
    }),
  );
}
