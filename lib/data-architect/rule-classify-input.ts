import { extractPhoneFromText } from "@/lib/enrichers/extract-phone";
import { normalizeArchitectAction } from "@/lib/data-architect/ingest-decision-options";
import { withArchitectConfidence } from "@/lib/data-architect/confidence";
import { listExistingContainers,
  findContainerByIdOrTitle,
} from "@/lib/data-architect/list-existing-containers";
import type {
  ArchitectContainerRef,
  DataArchitectAction,
  DataArchitectClassification,
  DataArchitectWire,
} from "@/lib/data-architect/types";
import {
  UNCATEGORIZED_CONTAINER_ID,
  UNCATEGORIZED_CONTAINER_TITLE,
} from "@/lib/data-architect/types";

const URL_PATTERN = /\bhttps?:\/\/[^\s<>"']+/gi;
const ADDRESS_PATTERN =
  /(?:[가-힣]{2,}(?:시|군|구)\s*)?[가-힣\d\s.-]+(?:로|길|동|읍|면|리)\s*\d*[^\n,]{0,40}/u;

const TOPIC_RULES: Array<{ topic: RegExp; containerId: string }> = [
  { topic: /(?:비트코인|btc|코인|투자|주식|finance|결제|구독)/iu, containerId: "bitcoin_trader" },
  { topic: /(?:뉴스|news|헤드라인|기사|브리핑)/iu, containerId: "news_briefing" },
  { topic: /(?:일정|미팅|회의|캘린더|appointment|schedule)/iu, containerId: "calendar_planner" },
  { topic: /(?:교통|지하철|버스|택시|내비|이동|transport)/iu, containerId: "transport_guard" },
  { topic: /(?:맛집|카페|식당|장소|place|주소)/iu, containerId: "place" },
  { topic: /(?:태풍|hurricane|typhoon|기상|폭우|호우|재난)/iu, containerId: "news_briefing" },
  { topic: /(?:포켓몬|pokemon|tcg|트레이딩\s*카드)/iu, containerId: "__create_new__" },
];

function uniqueStrings(items: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of items) {
    const trimmed = item.replace(/\s+/g, " ").trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    result.push(trimmed);
  }
  return result;
}

export function extractKnowledgeAndStream(rawInput: string): DataArchitectClassification {
  const knowledge: string[] = [];
  const stream: string[] = [];

  for (const url of rawInput.match(URL_PATTERN) ?? []) {
    knowledge.push(url.trim());
  }

  const phone = extractPhoneFromText(rawInput);
  if (phone) knowledge.push(`전화: ${phone}`);

  const addressMatch = rawInput.match(ADDRESS_PATTERN);
  if (addressMatch?.[0]) knowledge.push(`주소: ${addressMatch[0].trim()}`);

  const withoutFacts = rawInput
    .replace(URL_PATTERN, " ")
    .replace(ADDRESS_PATTERN, " ")
    .replace(phone ?? "", " ")
    .replace(/\s+/g, " ")
    .trim();

  if (withoutFacts.length >= 8) {
    if (/(?:느낌|감상|좋았|별로|사진|photo|메모|생각)/iu.test(withoutFacts)) {
      stream.push(withoutFacts.slice(0, 500));
    } else if (knowledge.length === 0) {
      stream.push(withoutFacts.slice(0, 500));
    } else {
      stream.push(withoutFacts.slice(0, 280));
    }
  }

  if (knowledge.length === 0 && stream.length === 0 && rawInput.trim()) {
    stream.push(rawInput.trim().slice(0, 500));
  }

  return { knowledge: uniqueStrings(knowledge), stream: uniqueStrings(stream) };
}

function inferAction(rawInput: string, containers: ArchitectContainerRef[]): {
  action: DataArchitectAction;
  container: ArchitectContainerRef | null;
  reasoning: string;
} {
  for (const rule of TOPIC_RULES) {
    if (!rule.topic.test(rawInput)) continue;

    if (rule.containerId === "place") {
      const place = containers.find((c) => c.kind === "place");
      if (place) {
        return { action: "APPEND", container: place, reasoning: "장소·맛집 관련 키워드가 있어 기존 장소 컨테이너에 추가합니다." };
      }
      return { action: "CREATE_NEW", container: null, reasoning: "장소 정보지만 기존 장소 컨테이너가 없어 새 컨테이너를 생성합니다." };
    }

    const match = containers.find((c) => c.id === rule.containerId);
    if (match) {
      return { action: "APPEND", container: match, reasoning: `'${match.title}' 컨테이너 주제와 입력 내용이 일치합니다.` };
    }

    if (rule.containerId === "__create_new__" || rule.topic.test(rawInput)) {
      return {
        action: "CREATE_NEW",
        container: null,
        reasoning: "주제는 파악됐지만 맞는 기존 컨테이너가 없어 새 컨테이너를 만듭니다.",
      };
    }
  }

  if (rawInput.trim().length < 12) {
    return { action: "UNCATEGORIZED", container: null, reasoning: "정보가 짧아 어느 컨테이너에도 확실히 배정하기 어렵습니다." };
  }

  const hasKnowledgeOnly =
    extractKnowledgeAndStream(rawInput).knowledge.length > 0 &&
    !TOPIC_RULES.some((rule) => rule.topic.test(rawInput));

  if (hasKnowledgeOnly) {
    return { action: "UNCATEGORIZED", container: null, reasoning: "사실·링크는 추출했지만 귀속 컨테이너가 불명확해 확인이 필요합니다." };
  }

  return { action: "CREATE_NEW", container: null, reasoning: "기존 컨테이너와 명확히 연결되지 않아 새 컨테이너 생성을 제안합니다." };
}

function proposeNewContainerTitle(rawInput: string): string {
  const firstLine = rawInput.split("\n")[0]?.trim() ?? rawInput.trim();
  const compact = firstLine.replace(URL_PATTERN, "").replace(/\s+/g, " ").trim();
  return compact.length <= 24 ? compact || "새 컨테이너" : `${compact.slice(0, 22)}…`;
}

export function ruleClassifyInput(rawInput: string): DataArchitectWire {
  const containers = listExistingContainers();
  const classification = extractKnowledgeAndStream(rawInput);
  const inferred = inferAction(rawInput, containers);

  if (inferred.action === "UNCATEGORIZED") {
    return withArchitectConfidence(
      {
        action: "UNCATEGORIZED",
        container_id: UNCATEGORIZED_CONTAINER_ID,
        container_title: UNCATEGORIZED_CONTAINER_TITLE,
        classification,
        reasoning: inferred.reasoning,
      },
      rawInput
    );
  }

  if (inferred.container) {
    return withArchitectConfidence(
      {
        action: "APPEND",
        container_id: inferred.container.id,
        container_title: inferred.container.title,
        classification,
        reasoning: inferred.reasoning,
      },
      rawInput
    );
  }

  const title = proposeNewContainerTitle(rawInput);
  return withArchitectConfidence(
    {
      action: "CREATE_NEW",
      container_id: `ctx-new-${title.replace(/\s+/g, "-").slice(0, 24)}`,
      container_title: title,
      classification,
      reasoning: inferred.reasoning,
    },
    rawInput
  );
}

export function normalizeArchitectWire(raw: unknown, fallback: DataArchitectWire): DataArchitectWire | null {
  if (!raw || typeof raw !== "object") return null;

  const record = raw as Record<string, unknown>;
  const action =
    normalizeArchitectAction(record.action) ??
    normalizeArchitectAction(record.decision_id) ??
    fallback.action;

  let classification = fallback.classification;
  if (record.classification && typeof record.classification === "object") {
    const row = record.classification as Record<string, unknown>;
    classification = {
      knowledge: Array.isArray(row.knowledge)
        ? row.knowledge.filter((item): item is string => typeof item === "string").slice(0, 12)
        : fallback.classification.knowledge,
      stream: Array.isArray(row.stream)
        ? row.stream.filter((item): item is string => typeof item === "string").slice(0, 12)
        : fallback.classification.stream,
    };
  }

  const containerIdRaw =
    typeof record.container_id === "string" && record.container_id.trim()
      ? record.container_id.trim()
      : fallback.container_id;

  const reasoning =
    typeof record.reasoning === "string" && record.reasoning.trim()
      ? record.reasoning.trim()
      : fallback.reasoning;

  if (action === "UNCATEGORIZED") {
    return {
      action,
      container_id: UNCATEGORIZED_CONTAINER_ID,
      container_title: UNCATEGORIZED_CONTAINER_TITLE,
      classification,
      reasoning,
    };
  }

  const matched = findContainerByIdOrTitle(containerIdRaw, listExistingContainers());
  return {
    action,
    container_id: matched?.id ?? containerIdRaw,
    container_title: matched?.title ?? (typeof record.container_id === "string" ? record.container_id : fallback.container_title),
    classification,
    reasoning,
  };
}
