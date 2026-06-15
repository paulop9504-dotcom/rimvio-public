import { isGeminiConfigured } from "@/lib/locate/gemini-config";
import { isOpenAiConfigured } from "@/lib/llm/openai-config";

export type CaptureVisionProvider = "gemini" | "openai";

export function captureVisionProvider(): CaptureVisionProvider {
  const explicit = process.env.CAPTURE_VISION_PROVIDER?.trim().toLowerCase();

  if (explicit === "openai") {
    return "openai";
  }

  if (explicit === "gemini") {
    return "gemini";
  }

  if (isOpenAiConfigured() && !isGeminiConfigured()) {
    return "openai";
  }

  return "gemini";
}

export function isCaptureVisionConfigured() {
  return captureVisionProvider() === "openai"
    ? isOpenAiConfigured()
    : isGeminiConfigured();
}

export function captureVisionProviderLabel() {
  return captureVisionProvider() === "openai" ? "OpenAI" : "Gemini";
}
