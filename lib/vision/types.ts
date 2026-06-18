import type { OcrRefinement } from "@/lib/screenshot/refine-ocr-llm";
import type { ScreenshotIntent } from "@/lib/screenshot/classify-intent";

export type VisionProvider = "google_vision" | "tesseract";

export type VisionSnapshot = {
  provider: VisionProvider;
  text: string;
  bestGuessLabels: string[];
  webEntities: string[];
  labels: string[];
  fashionScore: number;
  pagesWithMatchingImages: Array<{ url: string; title: string }>;
  visuallySimilarPages: Array<{ url: string; title: string }>;
  similarImageResults: Array<{ url: string; title: string; thumbnail?: string }>;
};

export type OcrResult = {
  text: string;
  provider: VisionProvider;
  vision?: VisionSnapshot;
  refinement?: OcrRefinement;
  intent?: ScreenshotIntent;
};
