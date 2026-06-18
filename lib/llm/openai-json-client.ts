import {
  openAiApiKey,
  openAiVisionModel,
  isOpenAiConfigured,
} from "@/lib/llm/openai-config";

export async function callOpenAiTextJson(input: {
  systemPrompt: string;
  userText: string;
  temperature?: number;
}): Promise<string | null> {
  if (!isOpenAiConfigured()) {
    return null;
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openAiApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: openAiVisionModel(),
      temperature: input.temperature ?? 0.1,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: input.systemPrompt },
        { role: "user", content: input.userText },
      ],
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`openai_failed:${response.status}:${detail.slice(0, 240)}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  return payload.choices?.[0]?.message?.content?.trim() ?? null;
}

export async function callOpenAiVisionJson(input: {
  systemPrompt: string;
  userText?: string;
  buffer: Buffer;
  mimeType: string;
  temperature?: number;
}): Promise<string> {
  if (!isOpenAiConfigured()) {
    throw new Error("openai_not_configured");
  }

  const dataUrl = `data:${input.mimeType};base64,${input.buffer.toString("base64")}`;
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openAiApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: openAiVisionModel(),
      temperature: input.temperature ?? 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: input.systemPrompt },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: input.userText?.trim() || "Analyze this image.",
            },
            {
              type: "image_url",
              image_url: { url: dataUrl },
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`openai_failed:${response.status}:${detail.slice(0, 240)}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  return payload.choices?.[0]?.message?.content?.trim() ?? "";
}
