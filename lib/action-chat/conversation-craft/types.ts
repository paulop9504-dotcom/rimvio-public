/** Sales / cognitive / lock-in techniques — distinct from UX guards & adaptive simplify. */
export type CraftTechniqueId =
  | "alternative_choice"
  | "assumptive_close"
  | "if_then_probe"
  | "takeaway"
  | "anchoring"
  | "zeigarnik_close"
  | "default_assumption"
  | "zero_step"
  | "cross_domain_stitch"
  | "contextual_pivot"
  | "mad_libs_slot"
  | "context_icon"
  | "polar_slider"
  | "vitality_quick_react";

export type CraftContextIcon = {
  icon: string;
  label: string;
  prompt: string;
  axis?: "meal" | "schedule" | "concern";
};

export type CraftMadLibsSlot = {
  id: string;
  label: string;
  value: string;
  alternatives: string[];
};

export type CraftPolarSlider = {
  left: string;
  right: string;
  defaultPosition: number;
};

export type CraftVitalityReact = {
  emoji: string;
  label: string;
  prompt: string;
  vitality: string;
};

export type ConversationCraftFlags = {
  techniques: CraftTechniqueId[];
  /** Hick's Law / precision UI — delegated to ux-guards; listed here for prompt docs only. */
  defersToUxGuard: ("hicks_law" | "precision_ui" | "progressive_disclosure")[];
  contextIcons: CraftContextIcon[];
  madLibs: CraftMadLibsSlot[] | null;
  polarSlider: CraftPolarSlider | null;
  vitalityReact: CraftVitalityReact[] | null;
  /** Repeated preference fingerprint from history (zero-step). */
  preferenceFingerprint: string | null;
  /** Upcoming schedule anchor for cross-domain. */
  scheduleAnchor: string | null;
};

export const EMPTY_CRAFT_FLAGS: ConversationCraftFlags = {
  techniques: [],
  defersToUxGuard: ["hicks_law", "precision_ui", "progressive_disclosure"],
  contextIcons: [],
  madLibs: null,
  polarSlider: null,
  vitalityReact: null,
  preferenceFingerprint: null,
  scheduleAnchor: null,
};
