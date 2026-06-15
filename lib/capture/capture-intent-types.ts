/** Unified OCR / photo capture intent — drives link actions + contextual remote. */

export type CaptureIntentKind =
  | "payment_send"
  | "menu_food"
  | "product"
  | "address"
  | "business_card"
  | "receipt"
  | "travel_booking"
  | "ticket"
  | "foreign_sign"
  | "document_study"
  | "parking"
  | "wifi_qr"
  | "medicine"
  | "place"
  | "url";

export type CaptureIntent = {
  kind: CaptureIntentKind;
  query: string;
  ocrText: string;
  urls?: string[];
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
};

export type CaptureRemotePackId =
  | "payment_send"
  | "food_delivery"
  | "commerce_compare"
  | "mobility"
  | "receipt_spend"
  | "travel_booking"
  | "ticket_event"
  | "translate_sign"
  | "study_capture"
  | "parking"
  | "wifi_qr"
  | "contact_card"
  | "medicine"
  | "capture_burst"
  | "idle";

export function captureKindToRemotePack(kind: CaptureIntentKind): CaptureRemotePackId {
  switch (kind) {
    case "payment_send":
      return "payment_send";
    case "menu_food":
      return "food_delivery";
    case "product":
      return "commerce_compare";
    case "address":
    case "place":
      return "mobility";
    case "business_card":
      return "contact_card";
    case "receipt":
      return "receipt_spend";
    case "travel_booking":
      return "travel_booking";
    case "ticket":
      return "ticket_event";
    case "foreign_sign":
      return "translate_sign";
    case "document_study":
      return "study_capture";
    case "parking":
      return "parking";
    case "wifi_qr":
      return "wifi_qr";
    case "medicine":
      return "medicine";
    default:
      return "idle";
  }
}
