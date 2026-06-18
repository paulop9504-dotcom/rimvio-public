import type { ArchitectContainerRef } from "@/lib/data-architect/types";

export function buildDataArchitectSystemPrompt(): string {
  return `# [ROLE: RIMVIO DATA ARCHITECT]
당신은 사용자의 파편화된 정보를 목적에 맞게 '컨테이너(Container)'로 분류하고 정리하는 데이터 아키텍트입니다.

# [INSTRUCTION]
사용자로부터 들어오는 입력(텍스트, 링크, 사진 설명 등)을 분석하여 다음 로직에 따라 처리하십시오.

# [PROCEDURE]
1. 목적 식별: 이 데이터가 기존의 어떤 'Container'와 연관되는지 판단하십시오. (기존 Container 목록을 참조)
2. 컨테이너 생성/배정:
   - 관련 Container가 있다면: 해당 Container의 [Stream] 또는 [Knowledge]로 분류하십시오.
   - 관련 Container가 없다면: "새 컨테이너"를 생성하고 적절한 이름을 제안하십시오.
   - 어디에도 속하지 않는다면: 'Uncategorized(임시)'로 분류하고 사용자에게 확인하십시오.
3. 데이터 정규화:
   - 링크/주소/전화번호 등은 [Knowledge]로 분리.
   - 감상, 사진, 메시지 등은 [Stream]으로 분리.

# [OUTPUT FORMAT (JSON)]
반드시 JSON 객체 하나만 반환하십시오.
{
  "container_id": "대상 컨테이너 ID 또는 생성될 이름",
  "action": "APPEND" | "CREATE_NEW" | "UNCATEGORIZED",
  "classification": {
    "knowledge": ["정제된 사실 정보 리스트"],
    "stream": ["정제된 기록물 리스트"]
  },
  "reasoning": "왜 이 컨테이너로 분류했는지 1문장 요약"
}`;
}

export function buildDataArchitectUserPayload(input: {
  containers: ArchitectContainerRef[];
  rawInput: string;
  linkTitle?: string | null;
  linkUrl?: string | null;
}): string {
  const linkBlock = [
    input.linkTitle ? `link_title: ${input.linkTitle}` : null,
    input.linkUrl ? `link_url: ${input.linkUrl}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return [
    "# [EXISTING CONTAINERS]",
    JSON.stringify(
      input.containers.map((container) => ({
        id: container.id,
        title: container.title,
        topic: container.topic ?? null,
        kind: container.kind,
      })),
      null,
      2
    ),
    "",
    "# [INPUT DATA]",
    input.rawInput.trim().slice(0, 4000),
    linkBlock ? `\n# [LINK CONTEXT]\n${linkBlock}` : "",
    "",
    "# [INSTRUCTION]",
    "위 컨테이너 중 이 데이터가 들어갈 곳을 찾으세요. 없으면 새로운 이름을 제안하세요.",
  ].join("\n");
}
