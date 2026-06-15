export function isGeminiConfigured() {
  return Boolean(geminiApiKey());
}

export function geminiApiKey() {
  return (
    process.env.GEMINI_API_KEY?.trim() ??
    process.env.GOOGLE_GEMINI_API_KEY?.trim() ??
    ""
  );
}

export function geminiVisionModel() {
  return process.env.GEMINI_VISION_MODEL?.trim() || "gemini-1.5-flash";
}
