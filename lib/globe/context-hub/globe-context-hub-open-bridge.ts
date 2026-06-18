export const GLOBE_CONTEXT_HUB_OPEN_REQUEST = "rimvio:globe-context-hub-open";

export type GlobeContextHubOpenRequestDetail = {
  contextEventId: string;
  source: "map_anchor" | "programmatic" | "lodging_focus";
};

export function dispatchGlobeContextHubOpen(
  detail: GlobeContextHubOpenRequestDetail,
): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(
    new CustomEvent<GlobeContextHubOpenRequestDetail>(
      GLOBE_CONTEXT_HUB_OPEN_REQUEST,
      { detail },
    ),
  );
}

export function subscribeGlobeContextHubOpen(
  listener: (detail: GlobeContextHubOpenRequestDetail) => void,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<GlobeContextHubOpenRequestDetail>).detail;
    if (!detail?.contextEventId?.trim()) {
      return;
    }
    listener(detail);
  };
  window.addEventListener(GLOBE_CONTEXT_HUB_OPEN_REQUEST, handler);
  return () => window.removeEventListener(GLOBE_CONTEXT_HUB_OPEN_REQUEST, handler);
}
