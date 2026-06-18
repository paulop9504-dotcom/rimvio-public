import { ruleClassifyInput } from "@/lib/data-architect/rule-classify-input";
import {
  createContainer,
  getContainerById,
  listActiveContainers,
  listContainers,
  touchContainer,
} from "@/lib/container-store/containers-store";
import type { ContainerRecord } from "@/lib/container-store/types";

const WORTH_CREATING_MIN_LEN = 24;
const WORTH_CREATING_HINT =
  /(?:프로젝트|목표|일정|미팅|기록|모음|온보딩|채널|카드|투자|브리핑|여행|학습)/iu;

export function isContainerWorthCreating(input: string): boolean {
  const trimmed = input.trim();
  if (trimmed.length < WORTH_CREATING_MIN_LEN) {
    return false;
  }
  if (WORTH_CREATING_HINT.test(trimmed)) {
    return true;
  }
  return trimmed.split(/\s+/).length >= 5;
}

function titleFromInput(input: string): string {
  const line = input.split("\n")[0]?.trim() ?? input.trim();
  return line.length <= 28 ? line : `${line.slice(0, 26)}…`;
}

/** Code-first container match — LLM optional upstream via ingestData. */
export function findRelevantContainer(input: {
  rawInput: string;
  preferActive?: boolean;
}): ContainerRecord | null {
  const wire = ruleClassifyInput(input.rawInput);

  if (wire.action === "UNCATEGORIZED") {
    return null;
  }

  const pool =
    input.preferActive !== false ? listActiveContainers() : listContainers({ status: "active" });
  const fromPool = pool.find((item) => item.id === wire.container_id);
  if (fromPool) {
    return touchContainer(fromPool.id);
  }

  const existing = getContainerById(wire.container_id);
  if (existing) {
    return touchContainer(existing.id);
  }

  if (wire.action === "CREATE_NEW") {
    return createContainer({
      id: wire.container_id.startsWith("ctx-") ? wire.container_id : undefined,
      title: wire.container_title,
      goal: wire.reasoning,
      topic: undefined,
      kind: "context",
    });
  }

  return null;
}

export async function findRelevantContainerAsync(input: {
  rawInput: string;
  linkTitle?: string | null;
  linkUrl?: string | null;
}): Promise<ContainerRecord | null> {
  const raw = [
    input.rawInput,
    input.linkTitle ? `title: ${input.linkTitle}` : null,
    input.linkUrl ? `url: ${input.linkUrl}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const ruleMatch = findRelevantContainer({ rawInput: raw });
  if (ruleMatch) {
    return ruleMatch;
  }

  if (!isContainerWorthCreating(raw)) {
    return null;
  }

  return createContainer({
    title: titleFromInput(raw),
    goal: "사용자 입력에서 자동 생성된 주제 컨테이너",
    kind: "context",
  });
}
