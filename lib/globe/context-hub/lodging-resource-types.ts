/** Lodging Resource payload — Hub factory emit (L3). */
export type LodgingResourcePayload = {
  placeId: string;
  name: string;
  images: readonly string[];
  videoUrl?: string | null;
  priceKrw?: number | null;
  partnerLabel?: string | null;
};

export const CONTEXT_LODGING_HUB_ENABLED_META_KEY = "contextLodgingHubEnabled";
export const CONTEXT_LODGING_INVENTORY_META_KEY = "contextLodgingInventory";

export type ContextLodgingInventoryRow = LodgingResourcePayload & {
  lat: number;
  lng: number;
  checkInIso?: string | null;
  checkOutIso?: string | null;
};
