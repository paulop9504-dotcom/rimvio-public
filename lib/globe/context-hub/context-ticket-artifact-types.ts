/** Ticket resource stored on context event metadata (Hub factory emit). */
export type ContextTicketArtifact = {
  labelKo: string;
  actionUrl: string | null;
  qrPreviewUrl: string | null;
  validFromIso?: string | null;
  validUntilIso?: string | null;
  placeLabel?: string | null;
};

export const CONTEXT_TICKET_ARTIFACT_META_KEY = "contextTicketArtifact";
