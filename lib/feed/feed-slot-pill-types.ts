import type { CapabilityId } from "@/lib/capability-registry";

export type FeedSlotDeeplinkPill = {
  kind: "deeplink";
  id: string;
  label: string;
  deeplink: string;
  fallbackDeeplink?: string;
};

export type FeedSlotCapabilityPill = {
  kind: "capability";
  id: string;
  label: string;
  capabilityId: CapabilityId;
};

export type FeedSlotPill = FeedSlotDeeplinkPill | FeedSlotCapabilityPill;
