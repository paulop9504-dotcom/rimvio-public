export type UxGuardFlags = {
  frustrationEscape: boolean;
  midThoughtPivot: boolean;
  contextFlushed: boolean;
  activeListening: boolean;
  simplifyMode: boolean;
  precisionAffordance: "minimal" | "rich";
  progressiveDisclosure: boolean;
};

export const EMPTY_UX_FLAGS: UxGuardFlags = {
  frustrationEscape: false,
  midThoughtPivot: false,
  contextFlushed: false,
  activeListening: false,
  simplifyMode: false,
  precisionAffordance: "minimal",
  progressiveDisclosure: false,
};
