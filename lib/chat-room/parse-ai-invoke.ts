const AI_PREFIXES = [/^@ai\b\s*/iu, /^\/ask\b\s*/iu, /^\/ai\b\s*/iu];

export type ParsedOutgoingMessage =
  | { kind: "human"; body: string }
  | { kind: "ai_invoke"; body: string; prompt: string };

export function parseOutgoingMessage(raw: string): ParsedOutgoingMessage {
  const body = raw.trim();
  if (!body) {
    return { kind: "human", body: "" };
  }

  for (const pattern of AI_PREFIXES) {
    if (pattern.test(body)) {
      const prompt = body.replace(pattern, "").trim();
      if (prompt) {
        return { kind: "ai_invoke", body, prompt };
      }
    }
  }

  return { kind: "human", body };
}

export function isAiInvokeText(raw: string): boolean {
  return parseOutgoingMessage(raw).kind === "ai_invoke";
}
