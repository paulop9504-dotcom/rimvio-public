import type { EventCandidateCategory } from "@/lib/events/event-candidate";
import {
  getActionContract,
  requiredSlotsForAction,
  type ActionContract,
} from "@/lib/event-kernel/action-contracts/action-contract-registry";
import { isSlimMentionFeatureId } from "@/lib/inside-out/slim-command-protocol";

export type MentionFeature = {
  featureId: string;
  displayName: string;
  aliases: readonly string[];
  action?: string;
  sourceRef: string;
  category: EventCandidateCategory;
  confirmCopy?: string;
};

/** Slim protocol — utilities (timer, focus, weather, memo, …) removed; NL → orchestrator. */
const REGISTRY: readonly MentionFeature[] = [
  {
    featureId: "navigate",
    displayName: "길찾기",
    aliases: ["길찾기", "navigate", "nav", "길", "네비", "네비게이션"],
    action: "NAVIGATE",
    sourceRef: "mention:navigate",
    category: "travel",
    confirmCopy: "어디로 길찾기 할까요?",
  },
  {
    featureId: "meal",
    displayName: "맛집",
    aliases: ["식사", "meal", "밥"],
    action: "MEAL_RECOMMENDATION",
    sourceRef: "mention:meal",
    category: "food",
  },
  {
    featureId: "schedule",
    displayName: "일정정리",
    aliases: ["일정정리", "schedule-organize"],
    action: "SCHEDULE_ORGANIZE",
    sourceRef: "mention:schedule",
    category: "schedule",
  },
  {
    featureId: "reminder",
    displayName: "알림",
    aliases: ["알림", "reminder", "리마인더", "알람"],
    sourceRef: "mention:reminder",
    category: "schedule",
    confirmCopy: "언제 알려드릴까요?",
  },
  {
    featureId: "transfer",
    displayName: "송금",
    aliases: ["송금", "transfer", "이체"],
    sourceRef: "mention:transfer",
    category: "finance",
    confirmCopy: "얼마를 보낼까요? 예: @송금 5만원",
  },
  {
    featureId: "parking",
    displayName: "주차",
    aliases: ["주차", "parking"],
    sourceRef: "mention:parking",
    category: "custom",
    confirmCopy: "위치를 적거나 사진을 찍어 주세요",
  },
  {
    featureId: "taxi",
    displayName: "택시",
    aliases: ["택시", "taxi", "t"],
    sourceRef: "mention:taxi",
    category: "travel",
    confirmCopy: "어디로 택시를 부를까요?",
  },
  {
    featureId: "link",
    displayName: "링크",
    aliases: ["링크", "link", "url"],
    sourceRef: "mention:link",
    category: "custom",
    confirmCopy: "URL을 붙여 넣거나 적어 주세요.",
  },
  {
    featureId: "dutch",
    displayName: "더치",
    aliases: ["더치", "dutch", "n빈", "n빵"],
    sourceRef: "mention:dutch",
    category: "finance",
    confirmCopy: "예: @더치 84000 4명",
  },
  {
    featureId: "delivery",
    displayName: "배달",
    aliases: ["배달", "delivery", "배민"],
    sourceRef: "mention:delivery",
    category: "food",
    confirmCopy: "무엇을 주문할까요?",
  },
  {
    featureId: "pickup",
    displayName: "픽업",
    aliases: ["픽업", "pickup"],
    sourceRef: "mention:pickup",
    category: "food",
    confirmCopy: "어디서 픽업할까요?",
  },
  {
    featureId: "receipt",
    displayName: "영수증",
    aliases: ["영수증", "receipt"],
    sourceRef: "mention:receipt",
    category: "finance",
  },
  {
    featureId: "gas",
    displayName: "주유",
    aliases: ["주유", "gas", "주유소"],
    sourceRef: "mention:gas",
    category: "travel",
    confirmCopy: "지역을 적어 주세요.",
  },
  {
    featureId: "station",
    displayName: "역",
    aliases: ["역", "station", "지하철", "버스"],
    sourceRef: "mention:station",
    category: "travel",
    confirmCopy: "역 이름을 적어 주세요.",
  },
  {
    featureId: "linksheet",
    displayName: "링크시트",
    aliases: ["링크시트", "linksheet", "시트링크"],
    sourceRef: "mention:linksheet",
    category: "custom",
    confirmCopy: "Google Sheets URL을 적어 주세요.",
  },
  {
    featureId: "manual",
    displayName: "호출어 설명서",
    aliases: ["설명서", "manual", "help", "도움말", "명령어"],
    sourceRef: "mention:manual",
    category: "custom",
  },
  {
    featureId: "friend_add",
    displayName: "친추",
    aliases: ["친추", "친구추가", "친구", "friend", "addfriend"],
    sourceRef: "mention:friend_add",
    category: "custom",
    confirmCopy:
      "전화번호, 이메일, Rimvio ID 중 하나를 적어 주세요. 예: @친추 sypark · @친추 010-1234-5678 · @친추 friend@gmail.com",
  },
  {
    featureId: "peer_talk",
    displayName: "톡",
    aliases: ["톡", "talk", "dm", "메신저", "쪽지", "대화"],
    sourceRef: "mention:peer_talk",
    category: "custom",
    confirmCopy: "친구 이름이나 Rimvio ID를 적어 주세요. @대화끝 으로 AI 피드로 돌아갈 수 있어요.",
  },
  {
    featureId: "group_talk",
    displayName: "단톡",
    aliases: ["단톡", "그룹", "group", "groupchat", "그룹톡"],
    sourceRef: "mention:group_talk",
    category: "custom",
    confirmCopy: "단톡 방 이름을 적어 주세요. /peers 에서 만든 방이에요.",
  },
  {
    featureId: "end_peer_talk",
    displayName: "대화끝",
    aliases: [
      "대화끝",
      "톡끝",
      "톡종료",
      "대화종료",
      "피드복귀",
      "talkend",
      "endtalk",
    ],
    sourceRef: "mention:end_peer_talk",
    category: "custom",
    confirmCopy: "피드 톡을 끝내고 AI 피드로 돌아가요.",
  },
  {
    featureId: "todo",
    displayName: "할일",
    aliases: ["할일", "todo", "할 일"],
    sourceRef: "mention:todo",
    category: "schedule",
    confirmCopy: "할 일과 시간을 적어 주세요.",
  },
  {
    featureId: "calendar",
    displayName: "캘린더",
    aliases: ["캘린더", "calendar", "달력"],
    sourceRef: "mention:calendar",
    category: "schedule",
  },
];

if (process.env.NODE_ENV !== "production") {
  for (const feature of REGISTRY) {
    if (!isSlimMentionFeatureId(feature.featureId)) {
      throw new Error(`mention registry drift: ${feature.featureId} not in slim protocol`);
    }
  }
}

const byAlias = new Map<string, MentionFeature>(
  REGISTRY.flatMap((feature) =>
    feature.aliases.map((alias) => [alias.trim().toLowerCase(), feature]),
  ),
);

export type MentionFeatureContract = MentionFeature & {
  contract: ActionContract | null;
  requiredSlots: readonly string[];
};

export function listMentionFeatures(): MentionFeature[] {
  return [...REGISTRY];
}

export function listMentionFeatureTokens(): string[] {
  return REGISTRY.flatMap((feature) => [...feature.aliases]);
}

export function isMentionFeatureToken(token: string): boolean {
  return byAlias.has(token.trim().toLowerCase());
}

export function resolveMentionFeature(token: string): MentionFeature | null {
  return byAlias.get(token.trim().toLowerCase()) ?? null;
}

export function getMentionFeature(featureId: string): MentionFeature | null {
  return REGISTRY.find((feature) => feature.featureId === featureId) ?? null;
}

export function resolveMentionFeatureContract(token: string): MentionFeatureContract | null {
  const feature = resolveMentionFeature(token);
  if (!feature) {
    return null;
  }
  const action = feature.action?.trim();
  const contract = action ? getActionContract(action) : null;
  return {
    ...feature,
    contract,
    requiredSlots: action ? requiredSlotsForAction(action) : [],
  };
}

export function buildMentionContextKey(feature: MentionFeature): string {
  return `event.${feature.category}.${feature.sourceRef}`;
}
