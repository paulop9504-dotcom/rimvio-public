import type {
  ActionCategoryHint,
  CandidateDomain,
  LlmActionCandidateInput,
  LlmActionCandidateWire,
} from "@/lib/llm-action-candidate-generator/types";

type Draft = Omit<LlmActionCandidateWire, "id" | "source">;

function pushUnique(bucket: Draft[], seen: Set<string>, item: Draft) {
  const key = `${item.label}::${item.plugin}`;
  if (seen.has(key)) {
    return;
  }
  seen.add(key);
  bucket.push(item);
}

function travelDrafts(input: LlmActionCandidateInput): Draft[] {
  const minutes = input.minutes_until_event ?? null;
  const place = input.location?.trim() || "공항";
  const drafts: Draft[] = [];
  const seen = new Set<string>();

  if (minutes == null || minutes > 180) {
    pushUnique(drafts, seen, {
      label: "여권·비자 유효기간 확인",
      plugin: "passport.check",
      category_hint: "auxiliary",
      reason: "international travel document check",
    });
    pushUnique(drafts, seen, {
      label: "현지 eSIM 개통 알아보기",
      plugin: "roaming.esim",
      category_hint: "auxiliary",
      reason: "connectivity abroad",
    });
    pushUnique(drafts, seen, {
      label: "환율·환전 시점 체크",
      plugin: "finance.fx",
      category_hint: "auxiliary",
      reason: "fx preparation",
    });
    pushUnique(drafts, seen, {
      label: "항공 티켓·체크인 확인",
      plugin: "ticket.view",
      category_hint: "main",
      reason: "flight readiness",
    });
  }

  if (minutes != null && minutes <= 180 && minutes > 30) {
    pushUnique(drafts, seen, {
      label: `${place}까지 길찾기`,
      plugin: "navigation",
      category_hint: "main",
      reason: "airport or station navigation",
    });
    pushUnique(drafts, seen, {
      label: "온라인 체크인·탑승권 저장",
      plugin: "ticket.view",
      category_hint: "main",
      reason: "boarding pass ready",
    });
    pushUnique(drafts, seen, {
      label: "공항 이동용 카카오T",
      plugin: "kakao.taxi",
      category_hint: "auxiliary",
      reason: "airport transfer",
    });
  }

  if (minutes != null && minutes <= 30) {
    pushUnique(drafts, seen, {
      label: "탑승권·게이트 정보 열기",
      plugin: "ticket.view",
      category_hint: "main",
      reason: "departure imminent",
    });
    pushUnique(drafts, seen, {
      label: "도착 후 교통 IC카드 충전",
      plugin: "transit.ic_card",
      category_hint: "auxiliary",
      reason: "local transit prep",
    });
  }

  if (input.spawn_phase === "on_site") {
    pushUnique(drafts, seen, {
      label: "현지 교통 IC카드 충전",
      plugin: "transit.ic_card",
      category_hint: "auxiliary",
      reason: "on-site transit",
    });
    pushUnique(drafts, seen, {
      label: "숙소·일정 지도 열기",
      plugin: "navigation",
      category_hint: "auxiliary",
      reason: "local orientation",
    });
  }

  return drafts;
}

function workDrafts(input: LlmActionCandidateInput): Draft[] {
  const minutes = input.minutes_until_event ?? null;
  const place = input.location?.trim();
  const drafts: Draft[] = [];
  const seen = new Set<string>();

  pushUnique(drafts, seen, {
    label: input.title.trim() || "미팅 참석",
    plugin: "calendar.view",
    category_hint: "main",
    reason: "core work commitment",
  });

  if (input.spawn_phase === "travel" || (minutes != null && minutes > 10 && minutes <= 120)) {
    const dest = place ? ` (${place})` : "";
    pushUnique(drafts, seen, {
      label: `카카오T 호출${dest}`,
      plugin: "kakao.taxi",
      category_hint: "main",
      reason: "travel to meeting venue",
    });
    pushUnique(drafts, seen, {
      label: place ? `${place}까지 이동 시간 확인` : "이동 시간 확인",
      plugin: "navigation",
      category_hint: "auxiliary",
      reason: "departure timing",
    });
  }

  if (input.spawn_phase === "on_site" || (minutes != null && minutes <= 10)) {
    pushUnique(drafts, seen, {
      label: "미팅용 회사 소개서 PDF 열기",
      plugin: "file.open",
      category_hint: "auxiliary",
      reason: "meeting materials",
    });
    pushUnique(drafts, seen, {
      label: "디지털 명함 QR코드",
      plugin: "card.qr",
      category_hint: "auxiliary",
      reason: "in-person intro",
    });
  }

  if (/(?:zoom|화상|online)/iu.test(input.title)) {
    pushUnique(drafts, seen, {
      label: "화상 회의 입장",
      plugin: "zoom.join",
      category_hint: "main",
      reason: "remote meeting entry",
    });
  }

  return drafts;
}

function toWire(
  ecId: string,
  drafts: Draft[],
  source: "rules" | "llm",
): LlmActionCandidateWire[] {
  return drafts.map((draft, index) => ({
    ...draft,
    id: `${ecId}:llm-cand:${source}:${index}`,
    source,
  }));
}

/** Sync creative candidate pool — travel/work only. */
export function generateRuleBasedActionCandidates(
  ecId: string,
  domain: CandidateDomain,
  input: LlmActionCandidateInput,
): LlmActionCandidateWire[] {
  const drafts = domain === "travel" ? travelDrafts(input) : workDrafts(input);
  return toWire(ecId, drafts, "rules");
}

export function categoryHintToTier(hint: ActionCategoryHint): "MAIN" | "AUX" {
  return hint === "main" ? "MAIN" : "AUX";
}
