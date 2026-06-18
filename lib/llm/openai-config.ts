export function isOpenAiConfigured() {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export function openAiModel() {
  return process.env.OPENAI_OCR_MODEL?.trim() || "gpt-4o-mini";
}

/** Vision capture + image understanding — gpt-4o-mini supports images. */
export function openAiVisionModel() {
  return process.env.OPENAI_VISION_MODEL?.trim() || openAiModel();
}

export function openAiApiKey() {
  return process.env.OPENAI_API_KEY?.trim() ?? "";
}
