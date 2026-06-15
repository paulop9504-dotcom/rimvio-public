/** Inline @주차 — photo capture or location record chip. */

export type InlineChatParkingMode = "photo_request" | "saved";

export type InlineChatParkingWire = {
  mode: InlineChatParkingMode;
  recordId: string;
  location: string | null;
  photoPreviewUrl: string | null;
  expiresAt: string;
  retentionLabel: string;
  summaryLine: string;
};

export function buildInlineChatParkingWire(input: {
  mode: InlineChatParkingMode;
  recordId: string;
  location: string | null;
  photoPreviewUrl: string | null;
  expiresAt: string;
  retentionLabel: string;
  summaryLine: string;
}): InlineChatParkingWire {
  return { ...input };
}
