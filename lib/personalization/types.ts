/** Stable action intent taxonomy for personalization (survives label/enrich changes). */
export type ActionFamily =
  | "save_open"
  | "price_compare"
  | "review_decide"
  | "summary_read"
  | "map_navigate"
  | "share_remind"
  | "contact_call"
  | "copy_clip"
  | "done_close";

export type DomainFamily =
  | "commerce"
  | "secondhand"
  | "news"
  | "map"
  | "media"
  | "social"
  | "generic";

export type LinkLifecycleState =
  | "saved"
  | "opened"
  | "compared"
  | "decided"
  | "done"
  | "undone";

export type RecentClickEntry = {
  action_family: ActionFamily;
  domain_family: DomainFamily;
  context_bin: string;
  weight: number;
  ts: string;
};

export type RecentActionProfile = {
  recent_clicks: RecentClickEntry[];
  family_counts: Partial<Record<ActionFamily, number>>;
  domain_affinity: Partial<Record<DomainFamily, number>>;
  click_total: number;
  updated_at?: string;
};

export type LinkLifecycleRecord = {
  link_id: string;
  domain_family: DomainFamily;
  link_category: string | null;
  lifecycle_state: LinkLifecycleState;
  first_saved_at: string;
  last_opened_at: string | null;
  last_action_family: ActionFamily | null;
  last_action_at: string | null;
  reopen_count: number;
};

export type PersonalizationScoreBreakdown = {
  rule: number;
  intentBin: number;
  personal: number;
  state: number;
  abilityPenalty: number;
  total: number;
  guardrailApplied: string[];
};

export type RankedPersonalizedAction = {
  action: import("@/types/database").LinkActionItem;
  breakdown: PersonalizationScoreBreakdown;
};
