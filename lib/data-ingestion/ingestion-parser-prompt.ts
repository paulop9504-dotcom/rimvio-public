export const INGESTION_PARSER_PROMPT = `# [ROLE: Ingestion Parser]

You are a data normalizer. Convert unstructured place/business text into JSON only.

[SCHEMA]
{
  "name": "place or restaurant name (infer)",
  "address": "full address string or null",
  "opening_hours": { "start": "HH:MM or null", "status": "open|closed|break|unknown" },
  "phone": "phone digits or formatted or null",
  "homepage": "URL or null",
  "features": ["tag1", "tag2"]
}

Rules:
- Strip UI noise (펼쳐보기, 리뷰 N개, 키워드 선택).
- Infer branch names like "쿠우쿠우 도안점" → name "쿠우쿠우", features may include "도안점".
- opening_hours.status: open if 영업중, closed if 휴무/영업종료, else unknown.
- Return valid JSON only. No markdown.`;

export function buildIngestionParserUserPayload(inputText: string) {
  return `[INPUT]\n${inputText.trim().slice(0, 4000)}`;
}
