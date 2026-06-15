import type { LinkActionItem } from "@/types/database";
import type { ScreenshotIntent } from "@/lib/screenshot/classify-intent";
import type { OcrRefinement } from "@/lib/screenshot/refine-ocr-llm";
import type { VisionSnapshot } from "@/lib/vision/types";

export type CapturePayload = {
  id: string;
  storedAt: number;
  thumbnailDataUrl: string;
  ocrText: string;
  provider: VisionSnapshot["provider"];
  vision?: VisionSnapshot;
  refinement?: OcrRefinement;
  intent: ScreenshotIntent;  title: string;
  category: string;
  actions: LinkActionItem[];
};
