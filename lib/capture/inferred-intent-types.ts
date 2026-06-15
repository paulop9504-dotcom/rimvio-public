import type { CaptureIntentKind } from "@/lib/capture/capture-intent-types";

/** Vision-first query result — replaces raw OCR as search input. */
export type InferredCaptureIntent = {
  kind: CaptureIntentKind;
  search_query: string;
  reasoning_path: string;
  confidence_score: number;
  is_ocr_relied: boolean;
  context_signal?: string;
  place_name?: string | null;
  product_name?: string | null;
  model_number?: string | null;
  /** Retained for copy-only actions — never used as search query. */
  ocrText?: string;
  amountWon?: number;
  merchant?: string;
  wifiSsid?: string;
  wifiPassword?: string;
  parkingSpot?: string;
  parkingUntil?: string;
  phone?: string;
  email?: string;
  company?: string;
  drugName?: string;
  accountDisplay?: string;
  bankHint?: string | null;
  eventDate?: string;
  venue?: string;
  urls?: string[];
  /** QR / link deeplink from vision. */
  target_url?: string | null;
  barcode_number?: string | null;
  content_title?: string | null;
};

export type CaptureVisionType =
  | "locate"
  | "product_search"
  | "utility"
  | "barcode_qr"
  | "content_summary"
  | "poster_contact"
  | "unknown";

export type CaptureVisionResult = {
  type: CaptureVisionType | null;
  search_query: string | null;
  /** Unified name field from Gemini vision JSON. */
  place_name_or_product?: string | null;
  place_name?: string | null;
  product_name?: string | null;
  model_number?: string | null;
  target_url?: string | null;
  barcode_number?: string | null;
  content_title?: string | null;
  confidence_score?: number;
  context_signal?: string;
  reasoning_path?: string;
  is_ocr_relied?: boolean;
};
