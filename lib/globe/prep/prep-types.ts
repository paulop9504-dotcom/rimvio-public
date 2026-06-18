import type { ExecutionProfileId } from "@/lib/globe/passive-context/types";

export const PREP_CHECKLIST_META_KEY = "prepChecklist";

export type PrepChecklistItemId =
  | "power_bank"
  | "comfortable_shoes"
  | "sun_protection"
  | "water"
  | "ticket_qr";

export type PrepChecklistItem = {
  id: PrepChecklistItemId;
  labelKo: string;
  checked: boolean;
  checkedAtIso: string | null;
};

export type PrepChecklistState = {
  profileId: ExecutionProfileId;
  updatedAtIso: string;
  items: PrepChecklistItem[];
};

export type PrepRequirementDef = {
  id: PrepChecklistItemId;
  labelKo: string;
};
