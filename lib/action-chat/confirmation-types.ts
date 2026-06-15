export type ConfirmationIntent = "CONFIRM" | "EXECUTE" | "WITTY";

export type WittyButtonWire = {
  label: string;
  action: string;
};

export type ConfirmDataCategory = "PLACE" | "TIME" | "CONTACT" | "OTHER";

export type ConfirmDataWire = {
  subject: string;
  category: ConfirmDataCategory;
};

export type BatchPendingItem = {
  type: string;
  summary?: string;
  extracted_data?: Partial<ConfirmationExtractedData> & {
    schedule_note?: string | null;
  };
};

export type FlushItemStatus = "success" | "failed" | "skipped";

export type FlushItemResult = {
  type: string;
  label: string;
  status: FlushItemStatus;
  error?: string;
};

export type TransactionalFlushReport = {
  succeeded: FlushItemResult[];
  failed: FlushItemResult[];
  summary: string;
  hasPartialFailure: boolean;
};

export type ConfirmInterruptWire = {
  user_message: string;
  awaiting_choice: boolean;
};

export type ConfirmationExtractedData = {
  address: string | null;
  phone: string | null;
  datetime: string | null;
  place_name: string | null;
  url: string | null;
  schedule_note?: string | null;
};

export type OrchestratorConfirmationWire = {
  meta: {
    intent: ConfirmationIntent;
  };
  thought?: string;
  /** Warm Rimvio persona line — shown in chat bubble */
  persona_message?: string;
  /** Short data-card prompt (not persona) */
  confirm_message?: string;
  confirm_data?: ConfirmDataWire;
  extracted_data?: ConfirmationExtractedData;
  batch_pending?: BatchPendingItem[];
  interrupt?: ConfirmInterruptWire;
  /** Context-aware button labels — replaces generic 네/아니오 when present */
  witty_buttons?: WittyButtonWire[];
  /** Live search results — inline chips on first turn */
  location_suggestions?: LocationSuggestion[];
  /** quick_pick | inline_pick | classic */
  location_ux?: LocationConfirmUxWire;
  /** 동명 중복 — 지오코딩 후보 + 지도 핀 */
  area_disambiguation?: AreaDisambiguationWire;
};

export type AreaDisambiguationWire = {
  /** 사용자가 말한 동·역 토큰 (예: 대치동) */
  area_token: string;
  prompt: string;
};

export type LocationSuggestion = {
  id: string;
  label: string;
  place_name: string;
  address: string;
  branch?: string;
  /** Learned from correction log — prior user choice */
  is_prior?: boolean;
  lat?: number;
  lng?: number;
  maps_url?: string;
  /** GPS 기준 거리 (km) — 「내 주변」 정렬용 */
  distance_km?: number;
};

export type LocationConfirmUxMode =
  | "quick_pick"
  | "inline_pick"
  | "prior_pick"
  | "area_disambiguation"
  | "classic";

export type LocationConfirmUxWire = {
  mode: LocationConfirmUxMode;
  prompt: string;
  recommended_id?: string;
  suggestions: LocationSuggestion[];
};

export type CorrectionLogEntry = {
  id: string;
  user_input: string;
  ai_inferred_location: string | null;
  ai_inferred_place_name: string | null;
  user_corrected_location: string | null;
  user_corrected_place_name: string | null;
  outcome: "accepted" | "corrected" | "rejected";
  createdAt: string;
};

export const CONFIRMATION_CONFIDENCE_THRESHOLD = 0.92;
