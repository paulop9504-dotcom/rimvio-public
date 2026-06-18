/** OCR → schedule candidate (extraction only; never persisted as calendar events). */
export type OcrExtractedEvent = {
  title: string;
  /** Full ISO start when date is explicit; empty until user resolves date */
  start: string;
  /** Full ISO end when date is explicit */
  end: string;
  /** YYYY-MM-DD only when OCR line had explicit date context (never screen default) */
  date: string | null;
  /** HH:mm when time detected on line */
  time: string | null;
  /** HH:mm end for ranges when date not yet merged to ISO */
  endTime: string | null;
  confidence: number;
  reason: string;
};

export type OcrEventExtractionResult = {
  events: OcrExtractedEvent[];
};
