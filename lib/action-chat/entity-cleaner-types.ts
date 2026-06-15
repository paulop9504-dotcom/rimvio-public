import type { LinkActionItem } from "@/types/database";
import type { NormalizedAddress } from "@/lib/action-chat/normalize-address";

export type { NormalizedAddress } from "@/lib/action-chat/normalize-address";

export type ExtractedPlaceInfo = {
  name: string | null;
  branch: string | null;
  address: NormalizedAddress | null;
  phone: string | null;
  website: string | null;
  hours: string | null;
  is_open: boolean | null;
};

export type EntityActionWire = {
  label: string;
  icon: string;
  url: string;
};

export type EntityCleanerWire = {
  summary: string;
  extracted_info: ExtractedPlaceInfo;
  actions: EntityActionWire[];
};

export type EntityArchitectResult = {
  wire: EntityCleanerWire;
  actions: LinkActionItem[];
};
