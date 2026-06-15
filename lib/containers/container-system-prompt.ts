import { generateChainedSystemPrompt } from "@/lib/containers/context-generator";

export function buildContainerSystemPromptBlock(input: {
  activeChains: string[];
  basePrompt?: string;
}): string | null {
  if (!input.activeChains.length) {
    return null;
  }

  return generateChainedSystemPrompt({
    basePrompt: input.basePrompt ?? CONTAINER_ISOLATION_BASE,
    activeChains: input.activeChains,
  });
}

const CONTAINER_ISOLATION_BASE = `# [CONCEPT: CONTAINER]
- '컨테이너'는 림비오(Rimvio)의 유일한 메모리 및 행동 실행 단위입니다.
- **Isolation Principle**: activeChains에 없는 외부 문맥을 컨테이너 내부로 가져오지 마십시오.
- **Memory Scope**: activeChains에 포함된 container_id 관련 데이터만 조회(Retrieve)하십시오.`;

export function buildContainerUnsupportedSummary() {
  return "현재 컨테이너에서는 지원하지 않는 기능입니다";
}

export { generateChainedSystemPrompt } from "@/lib/containers/context-generator";
